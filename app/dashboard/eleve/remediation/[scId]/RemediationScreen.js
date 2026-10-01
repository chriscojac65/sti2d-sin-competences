"use client";

import { useState } from "react";
import Link from "next/link";
import { enregistrerResultatRemediation } from "./actions";
import { GENERATEURS } from "@/lib/remediation/registre";

const COLORS = {
  bg: "#F7F5F0",
  surface: "#FFFFFF",
  text: "#1C1B1A",
  text2: "#6B6862",
  border: "#E4E1D9",
  accent: "#33506B",
  accentBg: "#E8EEF3",
  green: "#1F7A43",
  greenBg: "#E6F4EA",
  red: "#B23B33",
  redBg: "#FBEAEA",
  grey: "#8A8680",
  greyBg: "#F0EFEC",
  orange: "#C55A11",
  orangeBg: "#FBEEE1",
};

const OBJECTIF_STREAK = 3;

// --- Rendu du chronogramme (façon relevé d'oscilloscope) -----------------
// Volontairement sans étiquette (pas de "Start"/"D0"/"Stop") : c'est à
// l'élève de repérer la structure, comme sur un relevé réel. Seules les
// divisions sont numérotées, pour qu'il puisse répondre "position n°...".

const BIT_W = 34;
const MARGE_G = 14;
const Y_HAUT = 22;
const Y_BAS = 56;

function cheminChronogramme(trame) {
  let d = `M ${MARGE_G} ${trame[0] === 1 ? Y_HAUT : Y_BAS} `;
  trame.forEach((bit, i) => {
    const x1 = MARGE_G + i * BIT_W;
    const x2 = MARGE_G + (i + 1) * BIT_W;
    const y = bit === 1 ? Y_HAUT : Y_BAS;
    d += `L ${x1} ${y} L ${x2} ${y} `;
  });
  return d;
}

function Chronogramme({ trame }) {
  const largeur = MARGE_G * 2 + trame.length * BIT_W;
  const hauteur = 84;
  return (
    <svg width="100%" viewBox={`0 0 ${largeur} ${hauteur}`} style={{ display: "block" }}>
      {trame.map((_, i) => (
        <line
          key={i}
          x1={MARGE_G + i * BIT_W}
          y1={10}
          x2={MARGE_G + i * BIT_W}
          y2={68}
          stroke={COLORS.border}
          strokeWidth={1}
        />
      ))}
      <line
        x1={MARGE_G + trame.length * BIT_W}
        y1={10}
        x2={MARGE_G + trame.length * BIT_W}
        y2={68}
        stroke={COLORS.border}
        strokeWidth={1}
      />
      <path d={cheminChronogramme(trame)} fill="none" stroke={COLORS.accent} strokeWidth={2.5} />
      {trame.map((_, i) => (
        <text
          key={i}
          x={MARGE_G + i * BIT_W + BIT_W / 2}
          y={hauteur - 4}
          fontSize="9"
          textAnchor="middle"
          fill={COLORS.text2}
        >
          {i + 1}
        </text>
      ))}
    </svg>
  );
}

// --- Rendu de la présentation de l'exercice -------------------------------
// "chronogramme" : un relevé de signal (trame série). "texte" : un énoncé
// textuel (ex. circuit électrique) — l'élève doit alors faire le schéma
// lui-même sur papier, d'où le rappel explicite ci-dessous.

function Presentation({ presentation }) {
  if (presentation.kind === "chronogramme") {
    return (
      <div
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: "14px",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, color: COLORS.text2, marginBottom: 8 }}>
          Relevé d'oscilloscope — trame capturée (niveau haut = 1, niveau bas = 0) :
        </div>
        <div style={{ overflowX: "auto" }}>
          <Chronogramme trame={presentation.trame} />
        </div>
      </div>
    );
  }

  if (presentation.kind === "texte") {
    return (
      <>
        <div
          style={{
            background: COLORS.orangeBg,
            border: `1px solid ${COLORS.orange}44`,
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 12,
            fontSize: 12.5,
            color: COLORS.orange,
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          ⚠️ Fais le schéma de ce circuit sur une feuille avant de répondre — c'est indispensable
          pour bien repérer le(s) nœud(s) et la (les) maille(s).
        </div>
        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: "14px",
            marginBottom: 16,
            fontSize: 13.5,
            lineHeight: 1.5,
          }}
        >
          {presentation.enonce}
        </div>
      </>
    );
  }

  return null;
}

export default function RemediationScreen({
  sousCompetence,
  sousCompetencesLieesIds = [],
  streakInitial,
  valideInitial,
}) {
  const generateur = GENERATEURS[sousCompetence.code];

  const [streak, setStreak] = useState(streakInitial);
  const [valide, setValide] = useState(valideInitial);
  const [exercice, setExercice] = useState(() => (generateur ? generateur() : null));
  const [reponses, setReponses] = useState(() => (generateur ? new Array(exercice.questions.length).fill(null) : []));
  const [resultat, setResultat] = useState(null); // null | { reussie }
  const [enAttente, setEnAttente] = useState(false);

  if (!generateur) {
    return (
      <div style={{ minHeight: "100vh", padding: "24px 16px 48px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <Link href="/dashboard/eleve" style={{ fontSize: 12, color: COLORS.accent }}>
            &larr; Retour
          </Link>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: "12px 0" }}>
            {sousCompetence.code} — {sousCompetence.intitule}
          </h1>
          <p style={{ fontSize: 13.5, color: COLORS.text2 }}>
            L'exercice de remédiation pour cette compétence n'est pas encore disponible.
          </p>
        </div>
      </div>
    );
  }

  async function valider() {
    const reussie = exercice.questions.every((q, i) => reponses[i] === q.correcte);

    setEnAttente(true);
    const res = await enregistrerResultatRemediation({
      sous_competence_ids: [sousCompetence.id, ...sousCompetencesLieesIds],
      reussie,
    });
    setEnAttente(false);

    if (res?.success) {
      setStreak(res.streak);
      setValide(res.valide);
    }
    setResultat({ reussie });
  }

  function exerciceSuivant() {
    const nouveau = generateur();
    setExercice(nouveau);
    setReponses(new Array(nouveau.questions.length).fill(null));
    setResultat(null);
  }

  const toutRepondu = reponses.every((r) => r !== null);

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link href="/dashboard/eleve" style={{ fontSize: 12, color: COLORS.accent }}>
          &larr; Retour à mes compétences
        </Link>

        <h1 style={{ fontSize: 18, fontWeight: 700, margin: "12px 0 4px" }}>
          {sousCompetence.code} — {sousCompetence.intitule}
        </h1>
        <p style={{ fontSize: 13, color: COLORS.text2, margin: "0 0 16px" }}>
          Réussis {OBJECTIF_STREAK} exercices d'affilée pour valider la compétence
          {sousCompetencesLieesIds.length > 0 ? " (cet exercice valide aussi une compétence liée)" : ""}.
        </p>

        {valide ? (
          <div
            style={{
              background: COLORS.greenBg,
              border: `1px solid ${COLORS.green}44`,
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 16,
              fontSize: 13.5,
              color: COLORS.green,
              fontWeight: 600,
            }}
          >
            ✓ Compétence validée par remédiation. Tu peux continuer à t'entraîner si tu veux.
          </div>
        ) : (
          <StreakBar streak={streak} objectif={OBJECTIF_STREAK} />
        )}

        <Presentation presentation={exercice.presentation} />

        {exercice.questions.map((q, i) => (
          <QuestionQCM
            key={i}
            label={q.label}
            options={q.options}
            valeur={reponses[i]}
            onChange={(v) =>
              setReponses((r) => {
                const copie = [...r];
                copie[i] = v;
                return copie;
              })
            }
            desactive={!!resultat}
            correcte={q.correcte}
            afficherCorrection={!!resultat}
          />
        ))}

        {resultat && (
          <div
            style={{
              background: resultat.reussie ? COLORS.greenBg : COLORS.redBg,
              color: resultat.reussie ? COLORS.green : COLORS.red,
              border: `1px solid ${(resultat.reussie ? COLORS.green : COLORS.red)}44`,
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 16,
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            {resultat.reussie
              ? "Bien joué, exercice correct !"
              : "Pas tout à fait — la série repart à zéro. Les bonnes réponses sont surlignées ci-dessus."}
          </div>
        )}

        {!resultat ? (
          <button
            type="button"
            disabled={!toutRepondu || enAttente}
            onClick={valider}
            style={{
              width: "100%",
              background: toutRepondu ? COLORS.accent : COLORS.greyBg,
              color: toutRepondu ? "#fff" : COLORS.grey,
              border: "none",
              borderRadius: 10,
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 700,
              cursor: toutRepondu ? "pointer" : "default",
            }}
          >
            {enAttente ? "..." : "Valider mes réponses"}
          </button>
        ) : (
          <button
            type="button"
            onClick={exerciceSuivant}
            style={{
              width: "100%",
              background: COLORS.accent,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Exercice suivant
          </button>
        )}
      </div>
    </div>
  );
}

function StreakBar({ streak, objectif }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
      {Array.from({ length: objectif }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 8,
            borderRadius: 4,
            background: i < streak ? COLORS.green : COLORS.greyBg,
          }}
        />
      ))}
    </div>
  );
}

function QuestionQCM({ label, options, valeur, onChange, desactive, correcte, afficherCorrection }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((opt) => {
          const selectionne = valeur === opt;
          const estCorrecte = afficherCorrection && opt === correcte;
          const estMauvaiseSelection = afficherCorrection && selectionne && opt !== correcte;
          return (
            <button
              key={opt}
              type="button"
              disabled={desactive}
              onClick={() => onChange(opt)}
              style={{
                textAlign: "left",
                padding: "9px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "monospace",
                fontWeight: selectionne ? 700 : 500,
                background: estCorrecte
                  ? COLORS.greenBg
                  : estMauvaiseSelection
                  ? COLORS.redBg
                  : selectionne
                  ? COLORS.accentBg
                  : COLORS.surface,
                color: estCorrecte
                  ? COLORS.green
                  : estMauvaiseSelection
                  ? COLORS.red
                  : selectionne
                  ? COLORS.accent
                  : COLORS.text,
                border: `1px solid ${
                  estCorrecte
                    ? COLORS.green
                    : estMauvaiseSelection
                    ? COLORS.red
                    : selectionne
                    ? COLORS.accent
                    : COLORS.border
                }`,
                cursor: desactive ? "default" : "pointer",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
