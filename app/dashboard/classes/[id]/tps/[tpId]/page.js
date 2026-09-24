import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SupprimerTpButton from "./SupprimerTpButton";

const COLORS = {
  surface: "#FFFFFF",
  text: "#1C1B1A",
  text2: "#6B6862",
  border: "#E4E1D9",
  accent: "#33506B",
};

export default async function TpDetailPage({ params }) {
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

  const { data: tp } = await supabase
    .from("tps")
    .select("id, nom, date, classe_id, classes(nom)")
    .eq("id", params.tpId)
    .maybeSingle();
  if (!tp) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("id, numero, enonce, points_max, sous_competences(code, intitule)")
    .eq("tp_id", tp.id)
    .order("numero");

  const totalPoints = (questions || []).reduce((s, q) => s + Number(q.points_max), 0);

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <Link href={`/dashboard/classes/${tp.classe_id}/tps`} style={{ fontSize: 12.5, color: COLORS.accent }}>
            ← Fiches TP — {tp.classes?.nom}
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{tp.nom}</h1>
          <SupprimerTpButton tpId={tp.id} classeId={tp.classe_id} />
        </div>
        <p style={{ fontSize: 13, color: COLORS.text2, margin: "0 0 16px" }}>
          {tp.date ? `${tp.date} · ` : ""}
          {(questions || []).length} question(s) · {totalPoints} pts au total
        </p>

        <Link
          href={`/dashboard/classes/${tp.classe_id}/tps/${tp.id}/noter`}
          style={{
            display: "inline-block",
            background: COLORS.accent,
            color: "#fff",
            borderRadius: 10,
            padding: "10px 18px",
            fontWeight: 600,
            fontSize: 13.5,
            textDecoration: "none",
            marginBottom: 20,
          }}
        >
          Noter ce TP →
        </Link>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(questions || []).map((q) => (
            <div
              key={q.id}
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "12px 16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600 }}>
                <span>Q{q.numero}</span>
                <span style={{ color: COLORS.text2, fontWeight: 400 }}>{q.points_max} pt(s)</span>
              </div>
              <div style={{ fontSize: 13.5, margin: "4px 0" }}>{q.enonce}</div>
              <div style={{ fontSize: 12, color: COLORS.accent }}>
                {q.sous_competences?.code} — {q.sous_competences?.intitule}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
