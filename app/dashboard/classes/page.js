import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NouvelleClasseForm from "./NouvelleClasseForm";

const COLORS = {
  surface: "#FFFFFF",
  text: "#1C1B1A",
  text2: "#6B6862",
  border: "#E4E1D9",
  accent: "#33506B",
};

export default async function ClassesPage() {
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

  const [{ data: classes }, { data: referentiels }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, nom, annee_scolaire, referentiels(nom), eleves(count)")
      .order("created_at", { ascending: false }),
    supabase.from("referentiels").select("id, nom").order("nom"),
  ]);

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/dashboard" style={{ fontSize: 12.5, color: COLORS.accent }}>
            ← Tableau de bord
          </Link>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 20px" }}>Mes classes</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {(classes || []).length === 0 && (
            <p style={{ fontSize: 13.5, color: COLORS.text2 }}>Aucune classe pour l'instant.</p>
          )}
          {(classes || []).map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/classes/${c.id}`}
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
              <div style={{ fontWeight: 600, fontSize: 15 }}>{c.nom}</div>
              <div style={{ fontSize: 12.5, color: COLORS.text2, marginTop: 3 }}>
                {c.annee_scolaire} · {c.referentiels?.nom} ·{" "}
                {c.eleves?.[0]?.count ?? 0} élève(s)
              </div>
            </Link>
          ))}
        </div>

        <NouvelleClasseForm referentiels={referentiels || []} />
      </div>
    </div>
  );
}
