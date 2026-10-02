import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const COLORS = {
  bg: "#F7F5F0",
  surface: "#FFFFFF",
  text: "#1C1B1A",
  text2: "#6B6862",
  border: "#E4E1D9",
  accent: "#33506B",
};

async function signOut() {
  "use server";
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: prof } = await supabase
    .from("profs")
    .select("nom")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!prof) {
    const { data: eleve } = await supabase
      .from("eleves")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (eleve) {
      redirect("/dashboard/eleve");
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: "28px 32px",
        }}
      >
        <div style={{ fontSize: 12, color: COLORS.text2 }}>Terminale STI2D SIN</div>

        {prof ? (
          <>
            <h1 style={{ fontSize: 21, fontWeight: 700, margin: "6px 0 4px" }}>
              Bonjour, {prof.nom}
            </h1>
            <p style={{ fontSize: 13.5, color: COLORS.text2, margin: "0 0 20px" }}>
              Connecté en tant que professeur — {user.email}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                href="/dashboard/classes"
                style={{
                  display: "inline-block",
                  background: COLORS.accent,
                  color: "#fff",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontWeight: 600,
                  fontSize: 13.5,
                  textDecoration: "none",
                }}
              >
                Mes classes →
              </Link>
              <Link
                href="/dashboard/remediation-test"
                style={{
                  display: "inline-block",
                  background: "none",
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontWeight: 600,
                  fontSize: 13.5,
                  textDecoration: "none",
                }}
              >
                Tester une remédiation
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 21, fontWeight: 700, margin: "6px 0 4px" }}>
              Compte non activé
            </h1>
            <p style={{ fontSize: 13.5, color: COLORS.text2, lineHeight: 1.6 }}>
              Ton compte ({user.email}) existe mais n'est pas encore relié à un compte
              professeur. Contacte l'administrateur pour l'activer.
            </p>
          </>
        )}

        <form action={signOut} style={{ marginTop: 24 }}>
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
