"use client";

import { useState } from "react";
import Link from "next/link";
import { enregistrerResultatRemediation } from "./actions";

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
};

const OBJECTIF_STREAK = 3;

// --- Génération d'exercice : décodage d'une trame RS232 (C5-3) -----------
// Format repris de l'évaluation : start, D0..D7 (LSB en premier à la
// transmission), parité paire, stop. Lettre tirée parmi a-z (table annexe).

const LETTRES = "abcdefghijklmnopqrstuvwxyz".split("");

function bin8(n) {
  return n.toString(2).padStart(8, "0");
}
function hex2(n) {
  return "0x" + n.toString(16).toUpperCase().padStart(2, "0");
}
function popcount(n) {
  let c = 0;
  while (n) {
    c += n & 1;
    n >>= 1;
  }
  return c;
}
function melanger(arr) {
  const copie = [...arr];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

function genererTrameSerie() {
  const lettre = LETTRES[Math.floor(Math.random() * LETTRES.length)];
  const octet = lettre.charCodeAt(0);
  const bitsMSBfirst = bin8(octet).split("").map(Number); // D7..D0
  const bitsLSBfirst = [...bitsMSBfirst].reverse(); // D0..D7 (ordre de transmission)
  const parite = popcount(octet) % 2;
  const trame = [0, ...bitsLSBfirst, parite, 1]; // start, D0..D7, parité, stop

  const octetBinaire = bin8(octet);
  const octetHex = hex2(octet);
  const binInverse = bitsLSBfirst.join(""); // erreur classique : oubli du réordonnancement LSB->MSB
  const binPlus1 = bin8((octet + 1) & 0xff);
  const binMoins1 = bin8((octet - 1) & 0xff);

  const hexPlus1 = hex2((octet + 1) & 0xff);
  const hexMoins1 = hex2((octet - 1) & 0xff);
  const hexInverse = hex2(parseInt(binInverse, 2));

  const autresLettres = melanger(LETTRES.filter((l) => l !== lettre)).slice(0, 3);

  return {
    trame,
    bonnesReponses: { octetBinaire, octetHex, lettre },
    optionsQ1: melanger([octetBinaire, binInverse, binPlus1, binMoins1]),
    optionsQ2: melanger([octetHex, hexPlus1, hexMoins1, hexInverse]),
    optionsQ3: melanger([lettre, ...autresLettres]),
  };
}

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

const GENERATEURS = {
  "C5-3": genererTrameSerie,
};

export default function RemediationScreen({ sousCompetence, streakInitial, valideInitial }) {
  const generateur = GENERATEURS[sousCompetence.code];

  const [streak, setStreak] = useState(streakInitial);
  const [valide, setValide] = useState(valideInitial);
  const [exercice, setExercice] = useState(() => (generateur ? generateur() : null));
  const [reponses, setReponses] = useState({ q1: null, q2: null, q3: null });
  const [resultat, setResultat] = useState(null); // null | { reussie, detail }
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
    const reussie =
      reponses.q1 === exercice.bonnesReponses.octetBinaire &&
      reponses.q2 === exercice.bonnesReponses.octetHex &&
      reponses.q3 === exercice.bonnesReponses.lettre;

    setEnAttente(true);
    const res = await enregistrerResultatRemediation({
      sous_competence_id: sousCompetence.id,
      reussie,
    });
    setEnAttente(false);

    if (res?.success) {
      setStreak(res.streak);
      setValide(res.valide);
    }
    setResultat({ reussie });
  }

  function trameSuivante() {
    setExercice(generateur());
    setReponses({ q1: null, q2: null, q3: null });
    setResultat(null);
  }

  const toutRepondu = reponses.q1 && reponses.q2 && reponses.q3;

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
          Décode la trame ci-dessous. Réussis {OBJECTIF_STREAK} trames d'affilée pour valider la compétence.
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

        <div
          style={{
            background: COLORS.accentBg,
            border: `1px solid ${COLORS.accent}22`,
            borderRadius: 10,
            padding: "9px 12px",
            marginBottom: 12,
            fontSize: 11.5,
            color: COLORS.text,
            lineHeight: 1.4,
          }}
        >
          Rappel du format : 1 bit de start, 8 bits de données D0→D7 (D0 transmis en premier), 1 bit de
          parité paire, 1 bit de stop — soit 11 bits au total.
        </div>

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
            <Chronogramme trame={exercice.trame} />
          </div>
        </div>

        <QuestionQCM
          label="Octet transmis (binaire, ordre normal D7→D0)"
          options={exercice.optionsQ1}
          valeur={reponses.q1}
          onChange={(v) => setReponses((r) => ({ ...r, q1: v }))}
          desactive={!!resultat}
          correcte={exercice.bonnesReponses.octetBinaire}
          afficherCorrection={!!resultat}
        />
        <QuestionQCM
          label="Code hexadécimal"
          options={exercice.optionsQ2}
          valeur={reponses.q2}
          onChange={(v) => setReponses((r) => ({ ...r, q2: v }))}
          desactive={!!resultat}
          correcte={exercice.bonnesReponses.octetHex}
          afficherCorrection={!!resultat}
        />
        <QuestionQCM
          label="Caractère ASCII correspondant"
          options={exercice.optionsQ3}
          valeur={reponses.q3}
          onChange={(v) => setReponses((r) => ({ ...r, q3: v }))}
          desactive={!!resultat}
          correcte={exercice.bonnesReponses.lettre}
          afficherCorrection={!!resultat}
        />

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
              ? "Bien joué, trame correcte !"
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
            onClick={trameSuivante}
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
            Trame suivante
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
