import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COMPETENCES_LIEES, CODE_EXERCICE_PRINCIPAL } from "@/lib/remediation/registre";
import RemediationScreen from "./RemediationScreen";

export const dynamic = "force-dynamic";

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
    .select("id, code, intitule, formulation_eleve, competences(referentiel_id, referentiels(nom))")
    .eq("id", params.scId)
    .maybeSingle();
  if (!sc) redirect("/dashboard/eleve");

  // Les codes de sous-compétence ne sont uniques qu'au sein d'un référentiel
  // (voir registre.js) : toute recherche dans COMPETENCES_LIEES doit donc être
  // scopée par le référentiel réel de cette sous-compétence.
  const referentielId = sc.competences?.referentiel_id || null;
  const referentielNom = sc.competences?.referentiels?.nom || null;

  // Compétences liées : démontrées par le même exercice (voir registre.js).
  // sc.code peut être soit le code "principal" de l'exercice (ex. C5-3),
  // soit un code "lié" (ex. C5-2) : on résout d'abord vers le code principal
  // pour que le groupe de compétences à mettre à jour soit le même quel que
  // soit le point d'entrée, puis on prend tous les codes liés à ce principal
  // (le principal lui-même en moins, puisque sc.code le couvre déjà).
  // On reste scopé au référentiel réel de cette sous-compétence pour ne pas
  // risquer de valider une sous-compétence d'une autre classe qui porterait
  // le même code.
  const codePrincipal = (CODE_EXERCICE_PRINCIPAL[referentielNom] || {})[sc.code] || sc.code;
  const codesLies = [
    codePrincipal,
    ...((COMPETENCES_LIEES[referentielNom] || {})[codePrincipal] || []),
  ].filter((code) => code !== sc.code);
  let sousCompetencesLiees = [];
  if (codesLies.length > 0) {
    const { data: liees } = await supabase
      .from("sous_competences")
      .select("id, code, competences!inner(referentiel_id)")
      .in("code", codesLies)
      .eq("competences.referentiel_id", referentielId);
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
      referentielNom={referentielNom}
      sousCompetencesLieesIds={sousCompetencesLiees.map((s) => s.id)}
      streakInitial={progres?.streak_actuel ?? 0}
      valideInitial={progres?.valide ?? false}
    />
  );
}
