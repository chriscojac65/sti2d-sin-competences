"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireProf() {
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

  return supabase;
}

const STATUTS_VALIDES = ["acquis", "non_acquis", "non_evalue", "absent"];

export async function enregistrerEvaluation({ question_id, eleve_id, points_obtenus, statut_competence }) {
  const supabase = await requireProf();

  if (!STATUTS_VALIDES.includes(statut_competence)) {
    return { error: "Statut invalide." };
  }

  const points =
    statut_competence === "non_evalue" || statut_competence === "absent"
      ? 0
      : Number(points_obtenus) || 0;

  const { error } = await supabase.from("evaluations").upsert(
    {
      question_id,
      eleve_id,
      points_obtenus: points,
      statut_competence,
      date_saisie: new Date().toISOString(),
    },
    { onConflict: "question_id,eleve_id" }
  );

  if (error) return { error: error.message };
  return { success: true };
}

export async function marquerNonEvalueClasse({ question_id, eleve_ids }) {
  const supabase = await requireProf();

  const lignes = eleve_ids.map((eleve_id) => ({
    question_id,
    eleve_id,
    points_obtenus: 0,
    statut_competence: "non_evalue",
    date_saisie: new Date().toISOString(),
  }));

  const { error } = await supabase.from("evaluations").upsert(lignes, {
    onConflict: "question_id,eleve_id",
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function marquerAbsentTP({ eleve_id, question_ids }) {
  const supabase = await requireProf();

  const lignes = question_ids.map((question_id) => ({
    question_id,
    eleve_id,
    points_obtenus: 0,
    statut_competence: "absent",
    date_saisie: new Date().toISOString(),
  }));

  const { error } = await supabase.from("evaluations").upsert(lignes, {
    onConflict: "question_id,eleve_id",
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function rafraichirNotation(classeId, tpId) {
  revalidatePath(`/dashboard/classes/${classeId}/tps/${tpId}/noter`);
}
