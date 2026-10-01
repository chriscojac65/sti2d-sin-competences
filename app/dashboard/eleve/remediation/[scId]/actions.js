"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireEleve() {
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

  return { supabase, eleveId: eleve.id };
}

export async function enregistrerResultatRemediation({ sous_competence_id, reussie }) {
  const { supabase, eleveId } = await requireEleve();

  const { data: existant } = await supabase
    .from("remediation_progres")
    .select("streak_actuel, valide, date_validation")
    .eq("eleve_id", eleveId)
    .eq("sous_competence_id", sous_competence_id)
    .maybeSingle();

  const streakPrecedent = existant?.streak_actuel ?? 0;
  const dejaValide = existant?.valide ?? false;

  const nouveauStreak = reussie ? streakPrecedent + 1 : 0;
  const vientDeValider = !dejaValide && nouveauStreak >= 3;
  const estValide = dejaValide || vientDeValider;

  const { error } = await supabase.from("remediation_progres").upsert(
    {
      eleve_id: eleveId,
      sous_competence_id,
      streak_actuel: nouveauStreak,
      valide: estValide,
      date_validation: dejaValide
        ? existant.date_validation
        : vientDeValider
        ? new Date().toISOString()
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "eleve_id,sous_competence_id" }
  );

  if (error) return { error: error.message };
  return { success: true, streak: nouveauStreak, valide: estValide, vientDeValider };
}
