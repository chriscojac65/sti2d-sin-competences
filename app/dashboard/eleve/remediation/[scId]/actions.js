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

async function appliquerResultat(supabase, eleveId, sousCompetenceId, reussie) {
  const { data: existant } = await supabase
    .from("remediation_progres")
    .select("streak_actuel, valide, date_validation")
    .eq("eleve_id", eleveId)
    .eq("sous_competence_id", sousCompetenceId)
    .maybeSingle();

  const streakPrecedent = existant?.streak_actuel ?? 0;
  const dejaValide = existant?.valide ?? false;

  const nouveauStreak = reussie ? streakPrecedent + 1 : 0;
  const vientDeValider = !dejaValide && nouveauStreak >= 3;
  const estValide = dejaValide || vientDeValider;

  const { error } = await supabase.from("remediation_progres").upsert(
    {
      eleve_id: eleveId,
      sous_competence_id: sousCompetenceId,
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
  return { streak: nouveauStreak, valide: estValide, vientDeValider };
}

// sous_competence_ids : la compétence "principale" de l'exercice, suivie des
// compétences liées démontrées par le même exercice (voir registre.js). Le
// premier id de la liste est celui dont le résultat est renvoyé pour mettre
// à jour l'écran en cours ; les autres sont mis à jour en silence.
export async function enregistrerResultatRemediation({ sous_competence_ids, reussie }) {
  const { supabase, eleveId } = await requireEleve();

  const ids = Array.isArray(sous_competence_ids) ? sous_competence_ids : [sous_competence_ids];
  if (ids.length === 0) return { error: "Aucune compétence à mettre à jour." };

  const resultats = [];
  for (const id of ids) {
    const res = await appliquerResultat(supabase, eleveId, id, reussie);
    if (res.error) return res;
    resultats.push(res);
  }

  return { success: true, ...resultats[0] };
}
