"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, emailDepuisIdentifiant } from "@/lib/supabase/admin";

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

async function creerEleveAvecCompte(admin, supabase, { classe_id, nom, prenom, numero_valise, identifiant, mot_de_passe }) {
  if (!nom || !prenom || !identifiant || !mot_de_passe) {
    return { error: `Ligne incomplète (nom: "${nom || ""}", identifiant: "${identifiant || ""}") : nom, prénom, identifiant et mot de passe sont obligatoires.` };
  }
  if (mot_de_passe.length < 8) {
    return { error: `${prenom} ${nom} : le mot de passe doit faire au moins 8 caractères.` };
  }

  const email = emailDepuisIdentifiant(identifiant);

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: mot_de_passe,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message?.toLowerCase().includes("already registered") || authError.code === "email_exists") {
      return { error: `${prenom} ${nom} : l'identifiant "${identifiant}" est déjà utilisé par un autre élève.` };
    }
    return { error: `${prenom} ${nom} : ${authError.message}` };
  }

  const { error: insertError } = await supabase.from("eleves").insert({
    classe_id,
    nom,
    prenom,
    numero_valise: numero_valise || null,
    identifiant,
    auth_user_id: created.user.id,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: `${prenom} ${nom} : ${insertError.message}` };
  }

  return { id: created.user.id };
}

export async function ajouterEleve(formData) {
  const supabase = await requireProf();
  const admin = createAdminClient();

  const classe_id = formData.get("classe_id")?.toString();
  const nom = formData.get("nom")?.toString().trim();
  const prenom = formData.get("prenom")?.toString().trim();
  const numero_valise = formData.get("numero_valise")?.toString().trim();
  const identifiant = formData.get("identifiant")?.toString().trim();
  const mot_de_passe = formData.get("mot_de_passe")?.toString();

  const result = await creerEleveAvecCompte(admin, supabase, {
    classe_id,
    nom,
    prenom,
    numero_valise,
    identifiant,
    mot_de_passe,
  });

  if (result.error) return { error: result.error };

  revalidatePath(`/dashboard/classes/${classe_id}`);
  return { success: true };
}

export async function importerElevesExcel(formData) {
  const supabase = await requireProf();
  const admin = createAdminClient();

  const classe_id = formData.get("classe_id")?.toString();
  const file = formData.get("fichier");

  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "Merci de choisir un fichier." };
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rows.length === 0) {
    return { error: "Le fichier est vide ou n'a pas pu être lu." };
  }

  const erreurs = [];
  let nbOk = 0;

  for (const row of rows) {
    const get = (...cles) => {
      for (const cle of cles) {
        const trouve = Object.keys(row).find((k) => k.trim().toLowerCase() === cle);
        if (trouve && row[trouve] !== "") return row[trouve].toString().trim();
      }
      return "";
    };

    const result = await creerEleveAvecCompte(admin, supabase, {
      classe_id,
      nom: get("nom"),
      prenom: get("prenom", "prénom"),
      numero_valise: get("numero_valise", "numéro_valise", "numero de valise", "numéro de valise"),
      identifiant: get("identifiant"),
      mot_de_passe: get("mot_de_passe", "mot de passe", "password"),
    });

    if (result.error) {
      erreurs.push(result.error);
    } else {
      nbOk++;
    }
  }

  revalidatePath(`/dashboard/classes/${classe_id}`);
  return { success: true, nbOk, erreurs };
}

export async function modifierEleve(formData) {
  const supabase = await requireProf();

  const id = formData.get("id")?.toString();
  const classe_id = formData.get("classe_id")?.toString();
  const nom = formData.get("nom")?.toString().trim();
  const prenom = formData.get("prenom")?.toString().trim();
  const numero_valise = formData.get("numero_valise")?.toString().trim();

  if (!nom || !prenom) {
    return { error: "Nom et prénom sont obligatoires." };
  }

  const { error } = await supabase
    .from("eleves")
    .update({ nom, prenom, numero_valise: numero_valise || null })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/classes/${classe_id}`);
  return { success: true };
}

export async function supprimerEleve(formData) {
  const supabase = await requireProf();
  const admin = createAdminClient();

  const id = formData.get("id")?.toString();
  const classe_id = formData.get("classe_id")?.toString();

  const { data: eleve } = await supabase
    .from("eleves")
    .select("auth_user_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("eleves").delete().eq("id", id);
  if (error) return { error: error.message };

  if (eleve?.auth_user_id) {
    await admin.auth.admin.deleteUser(eleve.auth_user_id);
  }

  revalidatePath(`/dashboard/classes/${classe_id}`);
  return { success: true };
}
