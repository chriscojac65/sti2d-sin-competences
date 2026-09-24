import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const COLORS = {
  surface: "#FFFFFF",
  text: "#1C1B1A",
  text2: "#6B6862",
  border: "#E4E1D9",
  accent: "#33506B",
  green: "#1F7A43",
  greenBg: "#E6F4EA",
  red: "#B23B33",
  redBg: "#FBEAEA",
  grey: "#8A8680",
  greyBg: "#F0EFEC",
};

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

function StatutBadge({ statut }) {
  if (!statut || statut === "non_evalue") {
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
        Non évalué
      </span>
    );
  }
  const acquis = statut === "acquis";
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
      {acquis ? "Acquis" : "Non acquis"}
    </span>
  );
}

export default async function EleveTpDetailPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: eleve } = await supabase
    .from("eleves")
    .select("id, classe_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!eleve) redirect("/dashboard");

  const { data: tp } = await supabase
    .from("tps")
    .select("id, nom, date, type, classe_id")
    .eq("id", params.tpId)
    .maybeSingle();
  if (!tp || tp.classe_id !== eleve.classe_id) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("id, numero, enonce, points_max, sous_competences(code, intitule)")
    .eq("tp_id", tp.id)
    .order("numero");

  const questionIds = (questions || []).map((q) => q.id);
  const { data: evaluations } = questionIds.length
    ? await supabase
        .from("evaluations")
        .select("question_id, points_obtenus, statut_competence")
        .eq("eleve_id", eleve.id)
        .in("question_id", questionIds)
    : { data: [] };

  const evalParQuestion = new Map();
  for (const ev of evaluations || []) evalParQuestion.set(ev.question_id, ev);

  const totalPoints = (questions || []).reduce((s, q) => s + Number(q.points_max), 0);
  const totalObtenus = (questions || []).reduce((s, q) => {
    const ev = evalParQuestion.get(q.id);
    return ev && ev.statut_competence !== "non_evalue" ? s + Number(ev.points_obtenus) : s;
  }, 0);

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: 12 }}>
          <Link href="/dashboard/eleve" style={{ fontSize: 12.5, color: COLORS.accent }}>
            ← Mes TP
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0 }}>{tp.nom}</h1>
          <TypeBadge type={tp.type} />
        </div>
        <p style={{ fontSize: 13, color: COLORS.text2, margin: "0 0 20px" }}>
          {tp.date ? `${tp.date} · ` : ""}
          {(questions || []).length} question(s) · {totalObtenus}/{totalPoints} pt(s)
        </p>

        {(questions || []).length === 0 ? (
          <p style={{ fontSize: 13.5, color: COLORS.text2 }}>Ce TP n'a pas de questions.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(questions || []).map((q) => {
              const ev = evalParQuestion.get(q.id);
              return (
                <div
                  key={q.id}
                  style={{
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>
                    <span>Q{q.numero}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: COLORS.text2, fontWeight: 400 }}>
                        {ev ? Number(ev.points_obtenus) : 0} / {q.points_max} pt(s)
                      </span>
                      <StatutBadge statut={ev?.statut_competence} />
                    </div>
                  </div>
                  <div style={{ fontSize: 13.5, margin: "4px 0" }}>{q.enonce}</div>
                  <div style={{ fontSize: 12, color: COLORS.accent }}>
                    {q.sous_competences?.code} — {q.sous_competences?.intitule}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
