import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REMEDIATION_DISPONIBLE } from "@/lib/remediation/registre";

export const dynamic = "force-dynamic";

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

const SEUIL_ACQUIS = 75;
const OBJECTIF_REMEDIATION = 3;

// Même pagination que le tableau de suivi : Supabase plafonne à 1000 lignes.
async function recupererToutesLesLignes(supabase, table, colonnes, filtreIn) {
  const TAILLE_PAGE = 1000;
  let toutes = [];
  let page = 0;
  while (true) {
    const depart = page * TAILLE_PAGE;
    const { data, error } = await supabase
      .from(table)
      .select(colonnes)
      .in(filtreIn.colonne, filtreIn.valeurs)
      .range(depart, depart + TAILLE_PAGE - 1);
    if (error) throw error;
    toutes = toutes.concat(data || []);
    if (!data || data.length < TAILLE_PAGE) break;
    page++;
  }
  return toutes;
}

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function formatTempsDepuis(dateStr) {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  return `il y a ${Math.floor(heures / 24)} j`;
}

export default async function EleveProfPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase.from("profs").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!prof) redirect("/dashboard");

  const { data: classe } = await supabase
    .from("classes")
    .select("id, nom, referentiels(nom)")
    .eq("id", params.id)
    .maybeSingle();
  if (!classe) notFound();

  const { data: eleve } = await supabase
    .from("eleves")
    .select("id, nom, prenom, classe_id")
    .eq("id", params.eleveId)
    .maybeSingle();
  if (!eleve || eleve.classe_id !== classe.id) notFound();

  const codesAvecRemediation = REMEDIATION_DISPONIBLE[classe.referentiels?.nom] || new Set();

  const { data: tps } = await supabase
    .from("tps")
    .select("id, nom, date, type, questions(id, points_max, sous_competence_id, sous_competences(code, intitule))")
    .eq("classe_id", classe.id)
    .order("date", { ascending: true, nullsFirst: false });

  const [evaluations, progresListe, connexions] = await Promise.all([
    recupererToutesLesLignes(supabase, "evaluations", "question_id, points_obtenus, statut_competence", {
      colonne: "eleve_id",
      valeurs: [eleve.id],
    }),
    recupererToutesLesLignes(
      supabase,
      "remediation_progres",
      "sous_competence_id, streak_actuel, valide, date_validation",
      { colonne: "eleve_id", valeurs: [eleve.id] }
    ),
    recupererToutesLesLignes(supabase, "connexions_eleves", "connecte_le", {
      colonne: "eleve_id",
      valeurs: [eleve.id],
    }),
  ]);

  const progresParSc = new Map(progresListe.map((p) => [p.sous_competence_id, p]));
  const derniereConnexion = connexions.reduce(
    (max, c) => (!max || new Date(c.connecte_le) > new Date(max) ? c.connecte_le : max),
    null
  );

  const questionParId = new Map();
  const tpTypeParId = new Map();
  const scMap = new Map();
  for (const tp of tps || []) {
    tpTypeParId.set(tp.id, tp.type);
    for (const q of tp.questions || []) {
      questionParId.set(q.id, { ...q, tp_id: tp.id });
      if (q.sous_competences) scMap.set(q.sous_competence_id, q.sous_competences);
    }
  }
  const evalParQuestion = new Map();
  for (const ev of evaluations) {
    if (ev.statut_competence !== "non_evalue") evalParQuestion.set(ev.question_id, ev);
  }

  // Même règle que le tableau de suivi : si la compétence est évaluée dans au
  // moins une Evaluation, seules les Evaluations comptent ; sinon tous les TP.
  function pourcentage(scId) {
    const qs = Array.from(questionParId.values()).filter((q) => q.sous_competence_id === scId);
    const baseeSurEval = qs.some((q) => tpTypeParId.get(q.tp_id) === "Evaluation");
    let obtenus = 0;
    let max = 0;
    let nb = 0;
    for (const q of qs) {
      if (baseeSurEval && tpTypeParId.get(q.tp_id) !== "Evaluation") continue;
      const ev = evalParQuestion.get(q.id);
      if (!ev) continue;
      obtenus += Number(ev.points_obtenus);
      max += Number(q.points_max);
      nb++;
    }
    if (nb === 0) return { pct: null, baseeSurEval };
    return { pct: max > 0 ? Math.round((obtenus / max) * 100) : 0, baseeSurEval };
  }

  const competences = Array.from(scMap.entries())
    .map(([id, sc]) => {
      const { pct, baseeSurEval } = pourcentage(id);
      return {
        id,
        code: sc.code,
        intitule: sc.intitule,
        pct,
        baseeSurEval,
        aRemediation: codesAvecRemediation.has(sc.code),
        progres: progresParSc.get(id) || null,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  const nonAcquises = competences.filter((c) => c.pct !== null && c.pct < SEUIL_ACQUIS);
  const acquises = competences.filter((c) => c.pct !== null && c.pct >= SEUIL_ACQUIS);
  const nonEvaluees = competences.filter((c) => c.pct === null);
  const nbValidees = competences.filter((c) => c.aRemediation && c.progres?.valide).length;

  const notesTp = (tps || []).map((tp) => {
    const qs = tp.questions || [];
    const max = qs.reduce((s, q) => s + Number(q.points_max), 0);
    let obtenus = 0;
    let nb = 0;
    for (const q of qs) {
      const ev = evalParQuestion.get(q.id);
      if (ev) {
        obtenus += Number(ev.points_obtenus);
        nb++;
      }
    }
    return { tp, obtenus, max, nb, pct: max > 0 ? Math.round((obtenus / max) * 100) : 0 };
  });

  return (
    <div style={{ minHeight: "100vh", padding: "20px 16px 40px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: 14 }}>
          <Link href={`/dashboard/classes/${classe.id}/suivi`} style={{ fontSize: 13, color: COLORS.accent }}>
            ← Tableau de suivi
          </Link>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>
          {eleve.prenom} {eleve.nom}
        </h1>
        <p style={{ fontSize: 13, color: COLORS.text2, margin: "0 0 2px" }}>{classe.nom}</p>
        <p style={{ fontSize: 13, color: COLORS.text2, margin: "0 0 2px" }}>
          {connexions.length === 0
            ? "Jamais connecté"
            : `${connexions.length} connexion${connexions.length > 1 ? "s" : ""} · dernière ${formatTempsDepuis(
                derniereConnexion
              )}`}
        </p>
        <p style={{ fontSize: 13, fontWeight: 700, color: nbValidees > 0 ? COLORS.green : COLORS.text2, margin: "0 0 20px" }}>
          {nbValidees > 0
            ? `✓ ${nbValidees} compétence${nbValidees > 1 ? "s" : ""} validée${nbValidees > 1 ? "s" : ""} par remédiation`
            : "Aucune compétence validée par remédiation"}
        </p>

        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px", color: COLORS.red }}>
          À retravailler ({nonAcquises.length})
        </h2>
        {nonAcquises.length === 0 ? (
          <p style={{ fontSize: 13, color: COLORS.text2, margin: "0 0 20px" }}>
            Aucune compétence sous {SEUIL_ACQUIS}%.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "0 0 20px" }}>
            {nonAcquises.map((c) => (
              <CarteCompetence key={c.id} c={c} />
            ))}
          </div>
        )}

        <details style={{ margin: "0 0 20px" }}>
          <summary style={{ fontSize: 15, fontWeight: 700, color: COLORS.green, cursor: "pointer", padding: "4px 0" }}>
            Acquises ({acquises.length})
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {acquises.length === 0 ? (
              <p style={{ fontSize: 13, color: COLORS.text2, margin: 0 }}>Aucune pour l'instant.</p>
            ) : (
              acquises.map((c) => <CarteCompetence key={c.id} c={c} />)
            )}
          </div>
        </details>

        {nonEvaluees.length > 0 && (
          <p style={{ fontSize: 12.5, color: COLORS.text2, margin: "0 0 20px" }}>
            {nonEvaluees.length} compétence{nonEvaluees.length > 1 ? "s" : ""} pas encore évaluée
            {nonEvaluees.length > 1 ? "s" : ""} pour cet élève : {nonEvaluees.map((c) => c.code).join(", ")}.
          </p>
        )}

        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>TP et évaluations</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {notesTp.map(({ tp, obtenus, max, nb, pct }) => (
            <Link
              key={tp.id}
              href={`/dashboard/classes/${classe.id}/tps/${tp.id}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "10px 12px",
                textDecoration: "none",
                color: COLORS.text,
                fontSize: 13.5,
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {tp.nom}
                {tp.type === "Evaluation" && (
                  <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: COLORS.red, background: COLORS.redBg, borderRadius: 6, padding: "2px 7px" }}>
                    EVAL
                  </span>
                )}
              </span>
              <span style={{ whiteSpace: "nowrap", color: nb ? COLORS.text : COLORS.text2 }}>
                {nb ? `${obtenus}/${max} (${pct}%)` : "—"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function CarteCompetence({ c }) {
  const acquis = c.pct >= SEUIL_ACQUIS;
  let remediation = null;
  if (c.aRemediation) {
    if (c.progres?.valide) {
      remediation = (
        <span style={{ color: COLORS.green, fontWeight: 700 }}>
          ✓ validée par remédiation{c.progres.date_validation ? ` le ${formatDate(c.progres.date_validation)}` : ""}
        </span>
      );
    } else if (c.progres) {
      remediation = (
        <span style={{ color: COLORS.accent, fontWeight: 700 }}>
          Remédiation en cours : {c.progres.streak_actuel || 0}/{OBJECTIF_REMEDIATION}
        </span>
      );
    } else if (!acquis) {
      remediation = <span style={{ color: COLORS.text2 }}>Remédiation : pas encore essayée</span>;
    }
  }
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ fontSize: 13.5 }}>
          <span style={{ color: COLORS.accent, fontWeight: 700 }}>{c.code}</span> — {c.intitule}
        </div>
        <span
          style={{
            flexShrink: 0,
            background: acquis ? COLORS.greenBg : COLORS.redBg,
            color: acquis ? COLORS.green : COLORS.red,
            borderRadius: 6,
            padding: "3px 8px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {c.pct}%
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: COLORS.text2, marginTop: 4 }}>
        {c.baseeSurEval ? "Évaluation" : "TP"}
      </div>
      {remediation && <div style={{ fontSize: 12.5, marginTop: 4 }}>{remediation}</div>}
    </div>
  );
}
