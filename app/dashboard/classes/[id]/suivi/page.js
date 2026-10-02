import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REMEDIATION_DISPONIBLE } from "@/lib/remediation/registre";

// Sans ça, Next.js met en cache les requêtes Supabase indéfiniment (par défaut
// en Next 14) : une note saisie ailleurs ne rafraîchit jamais cette page tant
// qu'on ne le lui dit pas explicitement, ce qui affichait des totaux périmés.
export const dynamic = "force-dynamic";

// Supabase plafonne chaque requête à 1000 lignes par défaut. Cette page charge
// TOUTES les évaluations de la classe en une fois (actuellement >1000 pour une
// classe chargée), donc une requête simple en perdait une partie en silence,
// sans erreur — d'où des totaux faux et imprévisibles. On pagine par blocs de
// 1000 jusqu'à tout récupérer, quelle que soit la taille future des données.
async function recupererToutesLesLignes(supabase, table, colonnes, filtreIn) {
  const TAILLE_PAGE = 1000;
  let toutes = [];
  let page = 0;
  while (true) {
    const depart = page * TAILLE_PAGE;
    const fin = depart + TAILLE_PAGE - 1;
    const { data, error } = await supabase
      .from(table)
      .select(colonnes)
      .in(filtreIn.colonne, filtreIn.valeurs)
      .range(depart, fin);
    if (error) throw error;
    toutes = toutes.concat(data || []);
    if (!data || data.length < TAILLE_PAGE) break;
    page++;
  }
  return toutes;
}

const COLORS = {
  surface: "#FFFFFF",
  text: "#1C1B1A",
  text2: "#6B6862",
  border: "#E4E1D9",
  accent: "#33506B",
  accentBg: "#E8EEF3",
  green: "#1F7A43",
  greenBg: "#E6F4EA",
  red: "#B23B33",
  redBg: "#FBEAEA",
  grey: "#8A8680",
  greyBg: "#F0EFEC",
};

export default async function SuiviPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase
    .from("profs")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!prof) redirect("/dashboard");

  const { data: classe } = await supabase
    .from("classes")
    .select("id, nom, referentiels(nom)")
    .eq("id", params.id)
    .maybeSingle();
  if (!classe) notFound();

  // Codes de sous-compétence pour lesquels un exercice de remédiation existe
  // dans CE référentiel (les codes ne sont uniques qu'au sein d'un
  // référentiel, voir registre.js) : sert à savoir quelles lignes de la
  // légende rendre cliquables, plus bas.
  const referentielNom = classe.referentiels?.nom || null;
  const codesAvecRemediation = REMEDIATION_DISPONIBLE[referentielNom] || new Set();

  const [{ data: eleves }, { data: tps }] = await Promise.all([
    supabase
      .from("eleves")
      .select("id, nom, prenom")
      .eq("classe_id", classe.id)
      .order("nom"),
    supabase
      .from("tps")
      .select("id, nom, date, type, questions(id, points_max, sous_competence_id, sous_competences(code, intitule))")
      .eq("classe_id", classe.id)
      .order("date", { ascending: true, nullsFirst: false }),
  ]);

  const allQuestionIds = (tps || []).flatMap((tp) => (tp.questions || []).map((q) => q.id));

  const evaluations = allQuestionIds.length
    ? await recupererToutesLesLignes(
        supabase,
        "evaluations",
        "question_id, eleve_id, points_obtenus, statut_competence, date_saisie",
        { colonne: "question_id", valeurs: allQuestionIds }
      )
    : [];

  // Connexions des élèves (alimentées par un trigger côté base, à chaque
  // connexion réelle — voir la table connexions_eleves) : on en tire, pour
  // chaque élève, le nombre total de connexions et la date de la dernière.
  const eleveIds = (eleves || []).map((e) => e.id);
  const connexions = eleveIds.length
    ? await recupererToutesLesLignes(supabase, "connexions_eleves", "eleve_id, connecte_le", {
        colonne: "eleve_id",
        valeurs: eleveIds,
      })
    : [];

  const statsConnexionParEleve = new Map();
  for (const c of connexions) {
    const actuel = statsConnexionParEleve.get(c.eleve_id) || { nombre: 0, derniere: null };
    actuel.nombre += 1;
    if (!actuel.derniere || new Date(c.connecte_le) > new Date(actuel.derniere)) {
      actuel.derniere = c.connecte_le;
    }
    statsConnexionParEleve.set(c.eleve_id, actuel);
  }

  function formatTempsDepuis(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const heures = Math.floor(minutes / 60);
    if (heures < 24) return `il y a ${heures} h`;
    const jours = Math.floor(heures / 24);
    return `il y a ${jours} j`;
  }

  const questionParId = new Map();
  const tpTypeParId = new Map();
  for (const tp of tps || []) {
    tpTypeParId.set(tp.id, tp.type);
    for (const q of tp.questions || []) {
      questionParId.set(q.id, { ...q, tp_id: tp.id });
    }
  }

  const sousCompetencesMap = new Map();
  for (const tp of tps || []) {
    for (const q of tp.questions || []) {
      if (q.sous_competences) {
        sousCompetencesMap.set(q.sous_competence_id, q.sous_competences);
      }
    }
  }
  const sousCompetences = Array.from(sousCompetencesMap.entries())
    .map(([id, sc]) => ({ id, ...sc }))
    .sort((a, b) => a.code.localeCompare(b.code));

  function noteEleveTp(eleveId, tp) {
    const questionsTp = tp.questions || [];
    // Le dénominateur est toujours le barème réel du TP (comme dans la vue élève),
    // pas seulement la somme des questions déjà notées : sinon un TP partiellement
    // noté affiche un total qui varie d'un élève à l'autre (ex. "14/17" au lieu de
    // "14/20"), ce qui est trompeur dans un tableau censé comparer tout le monde
    // sur le même barème.
    const maxPossible = questionsTp.reduce((s, q) => s + Number(q.points_max), 0);
    let obtenus = 0;
    let nbNotees = 0;

    for (const q of questionsTp) {
      const evalu = (evaluations || []).find(
        (ev) => ev.question_id === q.id && ev.eleve_id === eleveId && ev.statut_competence !== "non_evalue"
      );
      if (evalu) {
        obtenus += Number(evalu.points_obtenus);
        nbNotees++;
      }
    }

    if (nbNotees === 0) return null;
    return { obtenus, maxPossible, pourcentage: maxPossible > 0 ? Math.round((obtenus / maxPossible) * 100) : 0 };
  }

  const SEUIL_ACQUIS = 75;

  function estBaseeSurEvaluations(sousCompetenceId) {
    const questionsSc = Array.from(questionParId.values()).filter(
      (q) => q.sous_competence_id === sousCompetenceId
    );
    return questionsSc.some((q) => tpTypeParId.get(q.tp_id) === "Evaluation");
  }

  function pourcentageEleveCompetence(eleveId, sousCompetenceId) {
    const baseeSurEvaluations = estBaseeSurEvaluations(sousCompetenceId);

    let obtenus = 0;
    let maxPossible = 0;
    let nbNotees = 0;

    for (const ev of evaluations || []) {
      if (ev.eleve_id !== eleveId || ev.statut_competence === "non_evalue") continue;
      const q = questionParId.get(ev.question_id);
      if (!q || q.sous_competence_id !== sousCompetenceId) continue;
      if (baseeSurEvaluations && tpTypeParId.get(q.tp_id) !== "Evaluation") continue;

      obtenus += Number(ev.points_obtenus);
      maxPossible += Number(q.points_max);
      nbNotees++;
    }

    if (nbNotees === 0) return null;
    return maxPossible > 0 ? Math.round((obtenus / maxPossible) * 100) : 0;
  }

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <Link href={`/dashboard/classes/${classe.id}`} style={{ fontSize: 12.5, color: COLORS.accent }}>
            ← {classe.nom}
          </Link>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Tableau de suivi</h1>
        <p style={{ fontSize: 13, color: COLORS.text2, margin: "0 0 4px" }}>
          {classe.nom} · {(eleves || []).length} élève(s) · {(tps || []).length} TP
        </p>
        <p style={{ fontSize: 12, color: COLORS.text2, margin: "0 0 20px" }}>
          Colonnes de compétence : pourcentage de réussite cumulé sur les questions évaluées liées à cette
          compétence. Le badge EVAL indique que le pourcentage n'est calculé que sur les évaluations ; le badge
          TP indique un calcul sur tous les TP confondus. Seuil de validation : {SEUIL_ACQUIS}%.
        </p>

        {(eleves || []).length === 0 ? (
          <p style={{ fontSize: 13.5, color: COLORS.text2 }}>Cette classe n'a pas encore d'élèves.</p>
        ) : (tps || []).length === 0 ? (
          <p style={{ fontSize: 13.5, color: COLORS.text2 }}>Aucun TP importé pour l'instant dans cette classe.</p>
        ) : (
          <>
            <div style={{ overflowX: "auto", border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        position: "sticky",
                        left: 0,
                        background: COLORS.surface,
                        textAlign: "left",
                        padding: "10px 14px",
                        borderBottom: `1px solid ${COLORS.border}`,
                        borderRight: `1px solid ${COLORS.border}`,
                        whiteSpace: "nowrap",
                        zIndex: 1,
                      }}
                    >
                      Élève
                    </th>
                    {(tps || []).map((tp) => (
                      <th
                        key={tp.id}
                        style={{
                          textAlign: "center",
                          padding: "10px 14px",
                          borderBottom: `1px solid ${COLORS.border}`,
                          whiteSpace: "nowrap",
                          fontWeight: 600,
                          color: COLORS.text,
                        }}
                      >
                        <Link
                          href={`/dashboard/classes/${classe.id}/tps/${tp.id}`}
                          style={{
                            color: COLORS.text,
                            textDecoration: "none",
                          }}
                        >
                          {tp.nom}
                        </Link>
                      </th>
                    ))}
                    {sousCompetences.map((sc) => (
                      <th
                        key={sc.id}
                        style={{
                          textAlign: "center",
                          padding: "10px 14px",
                          borderBottom: `1px solid ${COLORS.border}`,
                          borderLeft: sc === sousCompetences[0] ? `1px solid ${COLORS.border}` : undefined,
                          whiteSpace: "nowrap",
                          fontWeight: 600,
                          color: COLORS.accent,
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          {sc.code}
                          <TypeBadge type={estBaseeSurEvaluations(sc.id) ? "Evaluation" : "TP"} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(eleves || []).map((eleve, i) => (
                    <tr key={eleve.id} style={{ background: i % 2 === 1 ? "#FAFAF7" : COLORS.surface }}>
                      <td
                        style={{
                          position: "sticky",
                          left: 0,
                          background: i % 2 === 1 ? "#FAFAF7" : COLORS.surface,
                          padding: "9px 14px",
                          borderBottom: `1px solid ${COLORS.border}`,
                          borderRight: `1px solid ${COLORS.border}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>
                          {eleve.prenom} {eleve.nom}
                        </div>
                        <div style={{ fontSize: 10.5, fontWeight: 500, color: COLORS.text2, marginTop: 1 }}>
                          {(() => {
                            const stats = statsConnexionParEleve.get(eleve.id);
                            if (!stats) return "jamais connecté";
                            return `${stats.nombre} connexion${stats.nombre > 1 ? "s" : ""} · ${formatTempsDepuis(
                              stats.derniere
                            )}`;
                          })()}
                        </div>
                      </td>
                      {(tps || []).map((tp) => {
                        const note = noteEleveTp(eleve.id, tp);
                        return (
                          <td
                            key={tp.id}
                            style={{
                              textAlign: "center",
                              padding: "9px 14px",
                              borderBottom: `1px solid ${COLORS.border}`,
                              whiteSpace: "nowrap",
                              color: note ? COLORS.text : COLORS.text2,
                            }}
                          >
                            {note ? `${note.obtenus}/${note.maxPossible} (${note.pourcentage}%)` : "—"}
                          </td>
                        );
                      })}
                      {sousCompetences.map((sc, j) => {
                        const pourcentage = pourcentageEleveCompetence(eleve.id, sc.id);
                        return (
                          <td
                            key={sc.id}
                            style={{
                              textAlign: "center",
                              padding: "9px 10px",
                              borderBottom: `1px solid ${COLORS.border}`,
                              borderLeft: j === 0 ? `1px solid ${COLORS.border}` : undefined,
                            }}
                          >
                            <PourcentageBadge pourcentage={pourcentage} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sousCompetences.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>Légende des compétences</h2>
                <p style={{ fontSize: 11.5, color: COLORS.text2, margin: "0 0 8px" }}>
                  Les compétences surlignées ont un exercice de remédiation : clique dessus pour l'essayer
                  toi-même (rien n'est enregistré).
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {sousCompetences.map((sc) => {
                    const aUneRemediation = codesAvecRemediation.has(sc.code);
                    const contenu = (
                      <>
                        <span style={{ color: COLORS.accent, fontWeight: 700 }}>{sc.code}</span> — {sc.intitule}
                        <TypeBadge type={estBaseeSurEvaluations(sc.id) ? "Evaluation" : "TP"} />
                        {aUneRemediation && (
                          <span style={{ fontSize: 11, color: COLORS.accent, fontWeight: 600 }}>
                            → s'entraîner
                          </span>
                        )}
                      </>
                    );

                    if (!aUneRemediation) {
                      return (
                        <div
                          key={sc.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12.5,
                            color: COLORS.text2,
                            padding: "4px 6px",
                          }}
                        >
                          {contenu}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={sc.id}
                        href={`/dashboard/remediation-test/${sc.id}?classeId=${classe.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12.5,
                          color: COLORS.text2,
                          textDecoration: "none",
                          background: COLORS.accentBg,
                          borderRadius: 8,
                          padding: "4px 6px",
                        }}
                      >
                        {contenu}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  const isEval = type === "Evaluation";
  return (
    <span
      style={{
        display: "inline-block",
        background: isEval ? "#FBEAEA" : "#F0EFEC",
        color: isEval ? "#B23B33" : "#6B6862",
        borderRadius: 6,
        padding: "2px 7px",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {isEval ? "EVAL" : "TP"}
    </span>
  );
}

function PourcentageBadge({ pourcentage }) {
  if (pourcentage === null) {
    return (
      <span
        style={{
          display: "inline-block",
          background: COLORS.greyBg,
          color: COLORS.grey,
          borderRadius: 6,
          padding: "3px 8px",
          fontSize: 11,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        —
      </span>
    );
  }

  const acquis = pourcentage >= 75;

  return (
    <span
      style={{
        display: "inline-block",
        background: acquis ? COLORS.greenBg : COLORS.redBg,
        color: acquis ? COLORS.green : COLORS.red,
        borderRadius: 6,
        padding: "3px 8px",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {pourcentage}%
    </span>
  );
}
