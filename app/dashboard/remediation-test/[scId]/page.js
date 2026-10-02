import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RemediationScreen from "../../eleve/remediation/[scId]/RemediationScreen";

export const dynamic = "force-dynamic";

export default async function RemediationTestExercicePage({ params, searchParams }) {
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

  const { data: sc } = await supabase
    .from("sous_competences")
    .select("id, code, intitule, formulation_eleve, competences(referentiel_id, referentiels(nom))")
    .eq("id", params.scId)
    .maybeSingle();
  if (!sc) notFound();

  const referentielNom = sc.competences?.referentiels?.nom || null;

  // On revient vers le tableau de suivi d'où vient le clic (la légende passe
  // l'id de la classe en paramètre) ; à défaut, vers la liste des classes.
  const classeId = searchParams?.classeId;
  const retourHref = classeId ? `/dashboard/classes/${classeId}/suivi` : "/dashboard/classes";
  const retourLabel = classeId ? "Retour au tableau de suivi" : "Retour à mes classes";

  return (
    <RemediationScreen
      sousCompetence={sc}
      referentielNom={referentielNom}
      sousCompetencesLieesIds={[]}
      streakInitial={0}
      valideInitial={false}
      modeTest
      retourHref={retourHref}
      retourLabel={retourLabel}
    />
  );
}
