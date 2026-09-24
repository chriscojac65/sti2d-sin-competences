import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotationScreen from "./NotationScreen";

const COLORS = {
  text2: "#6B6862",
  accent: "#33506B",
};

export default async function NoterTpPage({ params }) {
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

  const { data: tp } = await supabase
    .from("tps")
    .select("id, nom, classe_id, classes(nom)")
    .eq("id", params.tpId)
    .maybeSingle();
  if (!tp) notFound();

  const [{ data: questions }, { data: eleves }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, numero, enonce, points_max, sous_competences(code, intitule)")
      .eq("tp_id", tp.id)
      .order("numero"),
    supabase
      .from("eleves")
      .select("id, nom, prenom")
      .eq("classe_id", tp.classe_id)
      .order("nom"),
  ]);

  const questionIds = (questions || []).map((q) => q.id);
  const { data: evaluations } = questionIds.length
    ? await supabase
        .from("evaluations")
        .select("question_id, eleve_id, points_obtenus, statut_competence")
        .in("question_id", questionIds)
    : { data: [] };

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: 12 }}>
          <Link href={`/dashboard/classes/${tp.classe_id}/tps/${tp.id}`} style={{ fontSize: 12.5, color: COLORS.accent }}>
            ← {tp.nom}
          </Link>
        </div>

        {(questions || []).length === 0 ? (
          <p style={{ fontSize: 13.5, color: COLORS.text2 }}>
            Ce TP n'a pas de questions à noter.
          </p>
        ) : (eleves || []).length === 0 ? (
          <p style={{ fontSize: 13.5, color: COLORS.text2 }}>
            Cette classe n'a pas encore d'élèves.
          </p>
        ) : (
          <NotationScreen
            classeId={tp.classe_id}
            tpId={tp.id}
            questions={questions}
            eleves={eleves}
            evaluations={evaluations || []}
          />
        )}
      </div>
    </div>
  );
}
