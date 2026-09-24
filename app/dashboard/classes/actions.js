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

export async function creerClasse(formData) {
  const supabase = await requireProf();

  const nom = formData.get("nom")?.toString().trim();
  const annee_scolaire = formData.get("annee_scolaire")?.toString().trim();
  const referentiel_id = formData.get("referentiel_id")?.toString();

  if (!nom || !annee_scolaire || !referentiel_id) {
    return { error: "Merci de remplir tous les champs." };
  }

  const { error } = await supabase.from("classes").insert({
    nom,
    annee_scolaire,
    referentiel_id,
  });

  if (error) {
    return { error: "Erreur lors de la création : " + error.message };
  }

  revalidatePath("/dashboard/classes");
  return { success: true };
}
