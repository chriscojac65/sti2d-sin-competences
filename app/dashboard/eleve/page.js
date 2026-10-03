import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REMEDIATION_DISPONIBLE, CODE_EXERCICE_PRINCIPAL } from "@/lib/remediation/registre";

// Évite que Next.js serve une version en cache des requêtes Supabase : sans
// ça, une note ou une remédiation récente peut ne pas apparaître tout de
// suite selon le dernier moment où cette page a été rechargée "à froid".
export const dynamic = "force-dynamic";

const COLORS = {
  bg: "#F7F5F0",
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
  orange: "#C55A11",
  orangeBg: "#FBEEE1",
};

const SEUIL_ACQUIS = 75;

async function signOut() {
  "use server";
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function EspaceElevePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: eleve } = await supabase
    .from("eleves")
    .select("id, nom, prenom, classe_id, classes(nom, referentiels(nom))")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!eleve) {
    redirect("/dashboard");
  }

  // Les codes de sous-compétence ne sont uniques qu'au sein d'un référentiel
  // (STI2D SIN et BTS CRSA réutilisent par exemple tous les deux "C5-3" pour
  // des compétences différentes) : on résout donc le référentiel de l'élève
  // une fois ici, et on l'utilise pour toute recherche dans le registre de
  // remédiation plus bas, pour ne jamais proposer l'exercice d'un autre
  // référentiel par coïncidence de code.
  const referentielNom = eleve.classes?.referentiels?.nom || null;
  const remediationDisponible = REMEDIATION_DISPONIBLE[referentielNom] || new Set();
  const codeExercicePrincipal = CODE_EXERCICE_PRINCIPAL[referentielNom] || {};

  const { data: tps } = await supabase
    .from("tps")
    .select(
      "id, nom, date, type, questions(id, points_max, sous_competence_id, sous_competences(code, intitule, formulation_eleve))"
    )
    .eq("classe_id", eleve.classe_id)
    .order("date", { ascending: true, nullsFirst: false });

  const allQuestionIds = (tps || []).flatMap((tp) => (tp.questions || []).map((q) => q.id));

  const { data: evaluations } = allQuestionIds.length
    ? await supabase
        .from("evaluations")
        .select("question_id, points_obtenus, statut_competence")
        .eq("eleve_id", eleve.id)
        .in("question_id", allQuestionIds)
    : { data: [] };

  const evalParQuestion = new Map();
  for (const ev of evaluations || []) {
    if (ev.statut_competence !== "non_evalue" && ev.statut_competence !== "absent") {
      evalParQuestion.set(ev.question_id, ev);
    }
  }

  const questionParId = new Map();
  const tpTypeParId = new Map();
  for (const tp of tps || []) {
    tpTypeParId.set(tp.id, tp.type);
    for (const q of tp.questions || []) questionParId.set(q.id, { ...q, tp_id: tp.id });
  }

  const sousCompetencesMap = new Map();
  for (const tp of tps || []) {
    for (const q of tp.questions || []) {
      if (q.sous_competences) sousCompetencesMap.set(q.sous_competence_id, q.sous_competences);
    }
  }
  const sousCompetences = Array.from(sousCompetencesMap.entries())
    .map(([id, sc]) => ({ id, ...sc }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const idParCode = new Map(sousCompetences.map((sc) => [sc.code, sc.id]));

  // Résout le lien "S'entraîner" d'une sous-compétence : certaines compétences
  // sont validées par l'exercice d'une autre (ex. C5-2 par l'exercice de C5-3,
  // voir registre.js) — le lien pointe alors vers l'id de cette dernière.
  function lienRemediationPour(code) {
    const codePrincipal = codeExercicePrincipal[code];
    if (!codePrincipal) return null;
    const idPrincipal = idParCode.get(codePrincipal);
    return idPrincipal ? `/dashboard/eleve/remediation/${idPrincipal}` : null;
  }

  const tpDateParId = new Map();
  for (const tp of tps || []) tpDateParId.set(tp.id, tp.date);

  const { data: remediationsValidees } = await supabase
    .from("remediation_progres")
    .select("sous_competence_id, date_validation")
    .eq("eleve_id", eleve.id)
    .eq("valide", true);

  const remediationMap = new Map(
    (remediationsValidees || []).map((r) => [r.sous_competence_id, r.date_validation])
  );

  function noteTp(tp) {
    let obtenus = 0;
    let maxPossible = 0;
    let nbNotees = 0;
    for (const q of tp.questions || []) {
      const evalu = evalParQuestion.get(q.id);
      if (evalu) {
        obtenus += Number(evalu.points_obtenus);
        maxPossible += Number(q.points_max);
        nbNotees++;
      }
    }
    if (nbNotees === 0) return null;
    return { obtenus, maxPossible, pourcentage: maxPossible > 0 ? Math.round((obtenus / maxPossible) * 100) : 0 };
  }

  function estBaseeSurEvaluations(sousCompetenceId) {
    const questionsSc = Array.from(questionParId.values()).filter(
      (q) => q.sous_competence_id === sousCompetenceId
    );
    return questionsSc.some((q) => tpTypeParId.get(q.tp_id) === "Evaluation");
  }

  function pourcentageCompetence(sousCompetenceId) {
    const baseeSurEvaluations = estBaseeSurEvaluations(sousCompetenceId);

    let obtenus = 0;
    let maxPossible = 0;
    let nbNotees = 0;
    for (const [questionId, ev] of evalParQuestion.entries()) {
      const q = questionParId.get(questionId);
      if (!q || q.sous_competence_id !== sousCompetenceId) continue;
      if (baseeSurEvaluations && tpTypeParId.get(q.tp_id) !== "Evaluation") continue;
      obtenus += Number(ev.points_obtenus);
      maxPossible += Number(q.points_max);
      nbNotees++;
    }
    if (nbNotees === 0) return null;
    return maxPossible > 0 ? Math.round((obtenus / maxPossible) * 100) : 0;
  }

  function questionsDeSc(sousCompetenceId) {
    return Array.from(questionParId.values()).filter((q) => q.sous_competence_id === sousCompetenceId);
  }

  function aUneAbsence(sousCompetenceId) {
    const qIds = new Set(questionsDeSc(sousCompetenceId).map((q) => q.id));
    return (evaluations || []).some((ev) => qIds.has(ev.question_id) && ev.statut_competence === "absent");
  }

  // Date la plus récente / la plus ancienne parmi les TP ayant contribué à l'évaluation
  // de cette sous-compétence (respecte le même filtre Evaluation-only que pourcentageCompetence).
  function datesEvaluation(sousCompetenceId) {
    const baseeSurEvaluations = estBaseeSurEvaluations(sousCompetenceId);
    const dates = [];
    for (const [questionId] of evalParQuestion.entries()) {
      const q = questionParId.get(questionId);
      if (!q || q.sous_competence_id !== sousCompetenceId) continue;
      if (baseeSurEvaluations && tpTypeParId.get(q.tp_id) !== "Evaluation") continue;
      const d = tpDateParId.get(q.tp_id);
      if (d) dates.push(d);
    }
    return dates;
  }

  function datesAbsence(sousCompetenceId) {
    const baseeSurEvaluations = estBaseeSurEvaluations(sousCompetenceId);
    const dates = [];
    for (const ev of evaluations || []) {
      if (ev.statut_competence !== "absent") continue;
      const q = questionParId.get(ev.question_id);
      if (!q || q.sous_competence_id !== sousCompetenceId) continue;
      if (baseeSurEvaluations && tpTypeParId.get(q.tp_id) !== "Evaluation") continue;
      const d = tpDateParId.get(q.tp_id);
      if (d) dates.push(d);
    }
    return dates;
  }

  // Message de synthèse : une compétence maîtrisée (la plus récemment évaluée) +
  // une compétence à consolider (la plus ancienne non acquise ou jamais travaillée faute
  // de présence), parmi celles qui ont une formulation élève. Pas de volet positif forcé
  // si rien n'est acquis. Une compétence uniquement marquée "absent" (aucune note valide
  // ailleurs) compte comme à rattraper, avec une formulation différente.
  const candidats = sousCompetences
    .filter((sc) => sc.formulation_eleve)
    .map((sc) => {
      const pourcentage = pourcentageCompetence(sc.id);
      const dateRemediation = remediationMap.get(sc.id) || null;
      const valideParRemediation = !!dateRemediation;
      const absenceSeule = !valideParRemediation && pourcentage === null && aUneAbsence(sc.id);
      const dates = valideParRemediation
        ? [dateRemediation]
        : absenceSeule
        ? datesAbsence(sc.id)
        : datesEvaluation(sc.id);
      return {
        sc,
        pourcentage,
        valideParRemediation,
        absenceSeule,
        estEval: estBaseeSurEvaluations(sc.id),
        dateRecente: dates.length ? dates.reduce((a, b) => (b > a ? b : a)) : null,
        dateAncienne: dates.length ? dates.reduce((a, b) => (b < a ? b : a)) : null,
      };
    })
    .filter((c) => c.pourcentage !== null || c.absenceSeule || c.valideParRemediation);

  const acquisCandidats = candidats.filter(
    (c) => c.valideParRemediation || (c.pourcentage !== null && c.pourcentage >= SEUIL_ACQUIS)
  );
  const nonAcquisCandidats = candidats.filter(
    (c) => !c.valideParRemediation && (c.absenceSeule || (c.pourcentage !== null && c.pourcentage < SEUIL_ACQUIS))
  );

  // Priorité de sélection, du plus au moins prioritaire :
  // 1. une compétence non acquise pour laquelle un exercice de remédiation existe
  //    (c'est elle qu'on veut pousser, puisque l'élève peut agir dessus immédiatement) ;
  // 2. à défaut, une compétence évaluée en Évaluation (plus significative qu'un TP) ;
  // 3. à défaut, n'importe quelle compétence non acquise.
  // Dans chaque niveau, on retient la plus ancienne non travaillée.
  const nonAcquisAvecRemediation = nonAcquisCandidats.filter((c) => remediationDisponible.has(c.sc.code));
  const nonAcquisEval = nonAcquisCandidats.filter((c) => c.estEval);
  const nonAcquisPool = nonAcquisAvecRemediation.length
    ? nonAcquisAvecRemediation
    : nonAcquisEval.length
    ? nonAcquisEval
    : nonAcquisCandidats;

  const acquisChoisi = acquisCandidats.sort((a, b) =>
    (b.dateRecente || "").localeCompare(a.dateRecente || "")
  )[0];
  const nonAcquisChoisi = nonAcquisPool.sort((a, b) =>
    (a.dateAncienne || "").localeCompare(b.dateAncienne || "")
  )[0];

  const lienEntrainement = nonAcquisChoisi ? lienRemediationPour(nonAcquisChoisi.sc.code) : null;

  const formuleNonAcquis = nonAcquisChoisi
    ? nonAcquisChoisi.absenceSeule
      ? `Tu n'as pas pu travailler ${nonAcquisChoisi.sc.formulation_eleve} (absence) — à rattraper.`
      : `Il reste à consolider ${nonAcquisChoisi.sc.formulation_eleve}.`
    : null;

  let messageSynthese = null;
  if (acquisChoisi && nonAcquisChoisi) {
    messageSynthese = `Tu maîtrises bien ${acquisChoisi.sc.formulation_eleve}. ${formuleNonAcquis}`;
  } else if (nonAcquisChoisi) {
    messageSynthese = formuleNonAcquis;
  } else if (acquisChoisi) {
    messageSynthese = `Tu maîtrises bien ${acquisChoisi.sc.formulation_eleve}. Continue comme ça !`;
  }

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ fontSize: 12, color: COLORS.text2, marginBottom: 4 }}>
          {eleve.classes?.nom}
        </div>
        <h1 style={{ fontSize: 21, fontWeight: 700, margin: "0 0 10px" }}>
          Bonjour, {eleve.prenom}
        </h1>

        {messageSynthese && (
          <div
            style={{
              background: COLORS.accentBg,
              border: `1px solid ${COLORS.accent}22`,
              borderRadius: 12,
              padding: "14px",
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 13.5, lineHeight: 1.45, color: COLORS.text, marginBottom: lienEntrainement ? 10 : 0 }}>
              {messageSynthese}
            </div>
            {lienEntrainement && (
              <Link
                href={lienEntrainement}
                style={{
                  display: "block",
                  textAlign: "center",
                  background: COLORS.accent,
                  color: "#fff",
                  borderRadius: 10,
                  padding: "11px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                S'entraîner maintenant →
              </Link>
            )}
          </div>
        )}

        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: COLORS.text }}>
          Mes TP
        </h2>
        {(tps || []).length === 0 ? (
          <p style={{ fontSize: 13, color: COLORS.text2, marginBottom: 24 }}>
            Aucun TP pour l'instant.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
            {tps.map((tp) => {
              const note = noteTp(tp);
              return (
                <Link
                  key={tp.id}
                  href={`/dashboard/eleve/tps/${tp.id}`}
                  style={{
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{tp.nom}</span>
                  <span style={{ fontSize: 13.5, color: note ? COLORS.text : COLORS.text2, whiteSpace: "nowrap" }}>
                    {note ? `${note.obtenus}/${note.maxPossible} (${note.pourcentage}%)` : "Pas encore noté"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px", color: COLORS.text }}>
          Mes compétences
        </h2>
        <p style={{ fontSize: 12, color: COLORS.text2, margin: "0 0 12px" }}>
          Pourcentage de réussite cumulé sur toutes les questions évaluées liées à chaque compétence. Le badge
          EVAL indique que le pourcentage n'est calculé que sur les évaluations ; le badge TP indique un calcul
          sur tous les TP confondus. Seuil de validation : {SEUIL_ACQUIS}%.
        </p>

        {sousCompetences.length === 0 ? (
          <p style={{ fontSize: 13, color: COLORS.text2 }}>Aucune compétence évaluée pour l'instant.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sousCompetences.map((sc) => {
              const pourcentage = pourcentageCompetence(sc.id);
              const baseeSurEvaluations = estBaseeSurEvaluations(sc.id);
              const valideParRemediation = remediationMap.has(sc.id);
              const absent = !valideParRemediation && pourcentage === null && aUneAbsence(sc.id);
              return (
                <CompetenceBar
                  key={sc.id}
                  sc={sc}
                  pourcentage={pourcentage}
                  type={baseeSurEvaluations ? "Evaluation" : "TP"}
                  absent={absent}
                  valideParRemediation={valideParRemediation}
                  // Le lien d'entraînement est proposé pour toute compétence qui a un
                  // exercice, acquise ou non — CompetenceBar le met plus ou moins en
                  // avant selon que la compétence reste à travailler ou pas.
                  lienRemediation={lienRemediationPour(sc.code)}
                />
              );
            })}
          </div>
        )}

        <form action={signOut} style={{ marginTop: 32 }}>
          <button
            type="submit"
            style={{
              background: "none",
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Se déconnecter
          </button>
        </form>
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

function CompetenceBar({ sc, pourcentage, type, absent, valideParRemediation, lienRemediation }) {
  const evalue = pourcentage !== null;
  const acquis = valideParRemediation || (evalue && pourcentage >= SEUIL_ACQUIS);
  const couleur = valideParRemediation
    ? COLORS.green
    : absent
    ? COLORS.orange
    : !evalue
    ? COLORS.grey
    : acquis
    ? COLORS.green
    : COLORS.red;
  const fond = valideParRemediation
    ? COLORS.greenBg
    : absent
    ? COLORS.orangeBg
    : !evalue
    ? COLORS.greyBg
    : acquis
    ? COLORS.greenBg
    : COLORS.redBg;

  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: "10px 14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
          <span style={{ color: COLORS.accent }}>{sc.code}</span> — {sc.intitule}
          <TypeBadge type={type} />
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: couleur,
            background: fond,
            borderRadius: 6,
            padding: "2px 7px",
            whiteSpace: "nowrap",
          }}
        >
          {valideParRemediation ? "Acquis (remédiation)" : absent ? "Absent" : evalue ? `${pourcentage}%` : "—"}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: COLORS.greyBg, overflow: "hidden", marginBottom: lienRemediation ? 8 : 0 }}>
        <div
          style={{
            height: "100%",
            width: `${valideParRemediation ? 100 : !absent && evalue ? pourcentage : 0}%`,
            background: couleur,
            borderRadius: 4,
          }}
        />
      </div>
      {lienRemediation &&
        (acquis ? (
          // Compétence déjà acquise : le lien reste accessible mais discret, pour ne
          // pas rivaliser visuellement avec ce qu'il reste vraiment à travailler.
          <Link
            href={lienRemediation}
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 500,
              color: COLORS.text2,
              textDecoration: "none",
            }}
          >
            Revoir / s'entraîner →
          </Link>
        ) : (
          <Link
            href={lienRemediation}
            style={{
              display: "inline-block",
              fontSize: 11.5,
              fontWeight: 600,
              color: COLORS.accent,
              textDecoration: "none",
            }}
          >
            S'entraîner →
          </Link>
        ))}
    </div>
  );
}
