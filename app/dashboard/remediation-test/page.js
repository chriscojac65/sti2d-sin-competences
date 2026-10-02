import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GENERATEURS } from "@/lib/remediation/registre";

export const dynamic = "force-dynamic";

const COLORS = {
  surface: "#FFFFFF",
  text: "#1C1B1A",
  text2: "#6B6862",
  border: "#E4E1D9",
  accent: "#33506B",
};

export default async function RemediationTestPage() {
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

  const { data: sousCompetences } = await supabase
    .from("sous_competences")
    .select("id, code, intitule, competences(referentiel_id, referentiels(nom))");

  // On ne garde, pour chaque référentiel, que les compétences pour
  // lesquelles un générateur existe dans le registre (voir registre.js) —
  // même logique que côté élève, pour ne jamais lister un exercice qui
  // n'existe pas encore.
  const parReferentiel = {};
  for (const referentielNom of Object.keys(GENERATEURS)) {
    const codesDisponibles = new Set(Object.keys(GENERATEURS[referentielNom]));
    parReferentiel[referentielNom] = (sousCompetences || [])
      .filter(
        (sc) =>
          sc.competences?.referentiels?.nom === referentielNom && codesDisponibles.has(sc.code)
      )
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/dashboard" style={{ fontSize: 12.5, color: COLORS.accent }}>
            ← Dashboard
          </Link>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Tester une remédiation</h1>
        <p style={{ fontSize: 13, color: COLORS.text2, margin: "0 0 24px" }}>
          Aperçu des exercices tels que les élèves les voient. Rien n'est enregistré en base, ni pour
          toi ni pour un élève.
        </p>

        {Object.entries(parReferentiel).map(([referentielNom, liste]) => (
          <div key={referentielNom} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>{referentielNom}</h2>
            {liste.length === 0 ? (
              <p style={{ fontSize: 13, color: COLORS.text2 }}>
                Aucun exercice disponible pour ce référentiel pour l'instant.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {liste.map((sc) => (
                  <Link
                    key={sc.id}
                    href={`/dashboard/remediation-test/${sc.id}`}
                    style={{
                      display: "block",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.surface,
                      textDecoration: "none",
                      color: COLORS.text,
                      fontSize: 13.5,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: COLORS.accent }}>{sc.code}</span> —{" "}
                    {sc.intitule}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
