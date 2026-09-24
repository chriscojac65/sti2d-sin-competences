import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, nom, prenom, classe_id, classes(nom)")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!eleve) {
    redirect("/dashboard");
  }

  const { data: tps } = await supabase
    .from("tps")
    .select("id, nom, date, type, questions(id, points_max, sous_competence_id, sous_competences(code, intitule))")
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
    if (ev.statut_competence !== "non_evalue") evalParQuestion.set(ev.question_id, ev);
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

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ fontSize: 12, color: COLORS.text2, marginBottom: 4 }}>
          {eleve.classes?.nom}
        </div>
        <h1 style={{ fontSize: 21, fontWeight: 700, margin: "0 0 20px" }}>
          Bonjour, {eleve.prenom}
        </h1>

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
              return (
                <CompetenceBar
                  key={sc.id}
                  sc={sc}
                  pourcentage={pourcentage}
                  type={baseeSurEvaluations ? "Evaluation" : "TP"}
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

function CompetenceBar({ sc, pourcentage, type }) {
  const evalue = pourcentage !== null;
  const acquis = evalue && pourcentage >= SEUIL_ACQUIS;
  const couleur = !evalue ? COLORS.grey : acquis ? COLORS.green : COLORS.red;
  const fond = !evalue ? COLORS.greyBg : acquis ? COLORS.greenBg : COLORS.redBg;

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
          {evalue ? `${pourcentage}%` : "—"}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: COLORS.greyBg, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${evalue ? pourcentage : 0}%`,
            background: couleur,
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}
