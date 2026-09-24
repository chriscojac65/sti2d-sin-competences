import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ImportTpForm from "./ImportTpForm";

const COLORS = {
  surface: "#FFFFFF",
  text: "#1C1B1A",
  text2: "#6B6862",
  border: "#E4E1D9",
  accent: "#33506B",
};

export default async function TpsPage({ params }) {
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
    .select("id, nom")
    .eq("id", params.id)
    .maybeSingle();
  if (!classe) notFound();

  const { data: tps } = await supabase
    .from("tps")
    .select("id, nom, date, type, questions(points_max)")
    .eq("classe_id", params.id)
    .order("date", { ascending: false, nullsFirst: false });

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <Link href={`/dashboard/classes/${classe.id}`} style={{ fontSize: 12.5, color: COLORS.accent }}>
            ← {classe.nom}
          </Link>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px" }}>Fiches TP</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {(tps || []).length === 0 && (
            <p style={{ fontSize: 13.5, color: COLORS.text2 }}>Aucune fiche TP pour l'instant.</p>
          )}
          {(tps || []).map((tp) => {
            const nbQuestions = tp.questions?.length || 0;
            const totalPoints = (tp.questions || []).reduce((s, q) => s + Number(q.points_max), 0);
            return (
              <Link
                key={tp.id}
                href={`/dashboard/classes/${classe.id}/tps/${tp.id}`}
                style={{
                  display: "block",
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  textDecoration: "none",
                  color: COLORS.text,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{tp.nom}</span>
                  <TypeBadge type={tp.type} />
                </div>
                <div style={{ fontSize: 12.5, color: COLORS.text2, marginTop: 3 }}>
                  {tp.date ? `${tp.date} · ` : ""}
                  {nbQuestions} question(s) · {totalPoints} pts
                </div>
              </Link>
            );
          })}
        </div>

        <ImportTpForm classeId={classe.id} />
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
