"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
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

export async function importerTP(formData) {
  const supabase = await requireProf();

  const classe_id = formData.get("classe_id")?.toString();
  const nom = formData.get("nom")?.toString().trim();
  const date = formData.get("date")?.toString() || null;
  const file = formData.get("fichier");

  if (!nom) return { error: "Le nom du TP est obligatoire." };
  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "Merci de choisir un fichier." };
  }

  const { data: classe } = await supabase
    .from("classes")
    .select("referentiel_id")
    .eq("id", classe_id)
    .maybeSingle();
  if (!classe) return { error: "Classe introuvable." };

  const { data: sousCompetences } = await supabase
    .from("sous_competences")
    .select("id, code, competences!inner(referentiel_id)")
    .eq("competences.referentiel_id", classe.referentiel_id);

  const parCode = new Map((sousCompetences || []).map((sc) => [sc.code.trim().toUpperCase(), sc.id]));

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rows.length === 0) {
    return { error: "Le fichier est vide ou n'a pas pu être lu." };
  }

  const questions = [];
  const erreurs = [];

  rows.forEach((row, i) => {
    const get = (...cles) => {
      for (const cle of cles) {
        const trouve = Object.keys(row).find((k) => k.trim().toLowerCase() === cle);
        if (trouve && row[trouve] !== "") return row[trouve].toString().trim();
      }
      return "";
    };

    const numero = get("numero", "num", "n°", "question");
    const enonce = get("enonce", "énoncé", "enonce_question");
    const points_max = get("points_max", "points", "bareme", "barème");
    const competenceCode = get("competence", "compétence", "code_competence", "code_compétence", "sous_competence", "sous-competence");

    const ligne = i + 2;

    if (!numero || !enonce || !points_max || !competenceCode) {
      erreurs.push(`Ligne ${ligne} : champ manquant (numero, enonce, points_max et competence sont obligatoires).`);
      return;
    }

    const sous_competence_id = parCode.get(competenceCode.toUpperCase());
    if (!sous_competence_id) {
      erreurs.push(`Ligne ${ligne} : code de compétence "${competenceCode}" inconnu dans le référentiel de cette classe.`);
      return;
    }

    const pointsNombre = Number(points_max.toString().replace(",", "."));
    if (Number.isNaN(pointsNombre)) {
      erreurs.push(`Ligne ${ligne} : "${points_max}" n'est pas un nombre de points valide.`);
      return;
    }

    questions.push({
      numero: parseInt(numero, 10),
      enonce,
      points_max: pointsNombre,
      sous_competence_id,
    });
  });

  if (erreurs.length > 0) {
    return { error: null, erreurs, aborted: true };
  }

  const type = formData.get("type")?.toString() === "Evaluation" ? "Evaluation" : "TP";

  const { data: tp, error: tpError } = await supabase
    .from("tps")
    .insert({ classe_id, nom, date, type })
    .select("id")
    .single();

  if (tpError) return { error: tpError.message };

  const { error: questionsError } = await supabase
    .from("questions")
    .insert(questions.map((q) => ({ ...q, tp_id: tp.id })));

  if (questionsError) {
    await supabase.from("tps").delete().eq("id", tp.id);
    return { error: questionsError.message };
  }

  revalidatePath(`/dashboard/classes/${classe_id}/tps`);
  return { success: true, nbQuestions: questions.length, tpId: tp.id };
}

export async function supprimerTP(formData) {
  const supabase = await requireProf();

  const id = formData.get("id")?.toString();
  const classe_id = formData.get("classe_id")?.toString();

  const { error } = await supabase.from("tps").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/classes/${classe_id}/tps`);
  return { success: true };
}
