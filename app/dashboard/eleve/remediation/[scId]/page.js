import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COMPETENCES_LIEES } from "@/lib/remediation/registre";
import RemediationScreen from "./RemediationScreen";

export default async function RemediationPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: eleve } = await supabase
    .from("eleves")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!eleve) redirect("/dashboard");

  const { data: sc } = await supabase
    .from("sous_competences")
    .select("id, code, intitule, formulation_eleve, competences(referentiel_id)")
    .eq("id", params.scId)
    .maybeSingle();
  if (!sc) redirect("/dashboard/eleve");

  // Compétences liées : démontrées par le même exercice (voir registre.js).
  // On les résout dans le même référentiel que la compétence principale,
  // pour ne pas risquer de valider une sous-compétence d'une autre classe
  // qui porterait le même code.
  const codesLies = COMPETENCES_LIEES[sc.code] || [];
  let sousCompetencesLiees = [];
  if (codesLies.length > 0) {
    const { data: liees } = await supabase
      .from("sous_competences")
      .select("id, code, competences!inner(referentiel_id)")
      .in("code", codesLies)
      .eq("competences.referentiel_id", sc.competences?.referentiel_id);
    sousCompetencesLiees = liees || [];
  }

  const { data: progres } = await supabase
    .from("remediation_progres")
    .select("streak_actuel, valide")
    .eq("eleve_id", eleve.id)
    .eq("sous_competence_id", sc.id)
    .maybeSingle();

  return (
    <RemediationScreen
      sousCompetence={sc}
      sousCompetencesLieesIds={sousCompetencesLiees.map((s) => s.id)}
      streakInitial={progres?.streak_actuel ?? 0}
      valideInitial={progres?.valide ?? false}
    />
  );
}
