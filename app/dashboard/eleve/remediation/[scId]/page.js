import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, code, intitule, formulation_eleve")
    .eq("id", params.scId)
    .maybeSingle();
  if (!sc) redirect("/dashboard/eleve");

  const { data: progres } = await supabase
    .from("remediation_progres")
    .select("streak_actuel, valide")
    .eq("eleve_id", eleve.id)
    .eq("sous_competence_id", sc.id)
    .maybeSingle();

  return (
    <RemediationScreen
      sousCompetence={sc}
      streakInitial={progres?.streak_actuel ?? 0}
      valideInitial={progres?.valide ?? false}
    />
  );
}
