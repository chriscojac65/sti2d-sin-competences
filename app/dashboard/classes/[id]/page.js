import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ElevesManager from "./ElevesManager";

export const dynamic = "force-dynamic";

const COLORS = {
  text2: "#6B6862",
  accent: "#33506B",
  border: "#E4E1D9",
};

export default async function ClasseDetailPage({ params }) {
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

  const [{ data: classe }, { data: eleves }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, nom, annee_scolaire, referentiels(nom)")
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("eleves")
      .select("id, nom, prenom, numero_valise, identifiant")
      .eq("classe_id", params.id)
      .order("nom"),
  ]);

  if (!classe) notFound();

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/dashboard/classes" style={{ fontSize: 12.5, color: COLORS.accent }}>
            ← Mes classes
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{classe.nom}</h1>
            <p style={{ fontSize: 13, color: COLORS.text2, margin: "0 0 24px" }}>
              {classe.annee_scolaire} · {classe.referentiels?.nom}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href={`/dashboard/classes/${classe.id}/suivi`}
              style={{
                background: "none",
                border: `1px solid ${COLORS.border}`,
                color: COLORS.accent,
                borderRadius: 10,
                padding: "9px 16px",
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Tableau de suivi
            </Link>
            <Link
              href={`/dashboard/classes/${classe.id}/tps`}
              style={{
                background: COLORS.accent,
                color: "#fff",
                borderRadius: 10,
                padding: "9px 16px",
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Fiches TP →
            </Link>
          </div>
        </div>

        <ElevesManager classeId={classe.id} eleves={eleves || []} />
      </div>
    </div>
  );
}
