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

// --- Rendu des chronogrammes à plusieurs signaux (C1-7) -------------------
// Un chronogramme "logique" compact, sans ligne de base type oscilloscope :
// une seule ligne horizontale par signal, qui monte/descend à chaque front.
// Utilisé à la fois pour les signaux d'entrée (A, B, C, affichés avec leur
// nom) et pour chaque proposition de réponse dans le QCM (juste le tracé de
// S, sans nom, pour ne pas donner d'indice par la mise en forme).

const SIGNAL_BIT_W = 28;
const SIGNAL_MARGE_G = 10;
const SIGNAL_Y_HAUT = 6;
const SIGNAL_Y_BAS = 24;

function cheminSignal(trame) {
  let d = `M ${SIGNAL_MARGE_G} ${trame[0] === 1 ? SIGNAL_Y_HAUT : SIGNAL_Y_BAS} `;
  trame.forEach((bit, i) => {
    const x1 = SIGNAL_MARGE_G + i * SIGNAL_BIT_W;
    const x2 = SIGNAL_MARGE_G + (i + 1) * SIGNAL_BIT_W;
    const y = bit === 1 ? SIGNAL_Y_HAUT : SIGNAL_Y_BAS;
    d += `L ${x1} ${y} L ${x2} ${y} `;
  });
  return d;
}

// Un seul tracé de signal, avec un repère vertical sur chaque division pour
// pouvoir aligner plusieurs signaux les uns sous les autres.
function SignalLogique({ trame, nom, couleur, avecDivisions }) {
  const largeur = SIGNAL_MARGE_G * 2 + trame.length * SIGNAL_BIT_W;
  const hauteur = 30;
  return (
    <svg width="100%" viewBox={`0 0 ${largeur} ${hauteur}`} style={{ display: "block" }}>
      {avecDivisions &&
        trame.map((_, i) => (
          <line
            key={i}
            x1={SIGNAL_MARGE_G + i * SIGNAL_BIT_W}
            y1={0}
            x2={SIGNAL_MARGE_G + i * SIGNAL_BIT_W}
            y2={hauteur}
            stroke={COLORS.border}
            strokeWidth={1}
          />
        ))}
      {avecDivisions && (
        <line
          x1={SIGNAL_MARGE_G + trame.length * SIGNAL_BIT_W}
          y1={0}
          x2={SIGNAL_MARGE_G + trame.length * SIGNAL_BIT_W}
          y2={hauteur}
          stroke={COLORS.border}
          strokeWidth={1}
        />
      )}
      <path d={cheminSignal(trame)} fill="none" stroke={couleur || COLORS.accent} strokeWidth={2.5} />
      {nom && (
        <text x={0} y={hauteur / 2 + 4} fontSize="11" fontWeight="700" fill={COLORS.text}>
          {nom}
        </text>
      )}
    </svg>
  );
}

// Les signaux d'entrée (A, B, C...), empilés avec leur nom en marge gauche.
function ChronogrammeEntrees({ entrees, trames }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 18 }}>
      {entrees.map((nom) => (
        <div key={nom} style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: -18, top: 4, fontSize: 11, fontWeight: 700 }}>{nom}</div>
          <SignalLogique trame={trames[nom]} couleur={COLORS.text2} avecDivisions />
        </div>
      ))}
    </div>
  );
}

// Un tracé de S compact, sans nom ni divisions — utilisé comme bouton de
// réponse dans le QCM graphique (voir QuestionQCMChronogramme).
function MiniChronogrammeOption({ trame }) {
  return <SignalLogique trame={trame} couleur="currentColor" avecDivisions={false} />;
}

// --- Rendu du logigramme (symboles normalisés : "&" = ET, "≥1" = OU,
// "1" + bulle en sortie = NON) ---------------------------------------------
// Deux topologies : "A" (3 entrées, 2 portes en cascade) et "B" (4 entrées,
// 2 portes en parallèle puis une 3e qui combine leurs sorties). Une seule
// entrée peut être inversée (porte NON) avant d'entrer dans sa porte.

function GateBox({ x, y, w, h, type }) {
  const symbole = type === "ET" ? "&" : "≥1";
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={COLORS.surface} stroke={COLORS.text} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + h / 2 + 6} fontSize="18" fontWeight="700" textAnchor="middle">
        {symbole}
      </text>
    </g>
  );
}

function PorteNON({ x, y }) {
  const w = 24;
  const h = 14;
  return (
    <g>
      <rect x={x} y={y - h / 2} width={w} height={h} fill={COLORS.surface} stroke={COLORS.text} strokeWidth={1.1} />
      <text x={x + w / 2} y={y + 4} fontSize="10" fontWeight="700" textAnchor="middle">
        1
      </text>
      <circle cx={x + w + 3} cy={y} r={2.6} fill={COLORS.surface} stroke={COLORS.text} strokeWidth={1.1} />
    </g>
  );
}

// Ligne horizontale entre deux abscisses à une ordonnée donnée, avec
// éventuellement une porte NON insérée au milieu.
function LigneHorizontale({ y, xDebut, xFin, inversee }) {
  if (!inversee) {
    return <line x1={xDebut} y1={y} x2={xFin} y2={y} stroke={COLORS.text} strokeWidth={1.3} />;
  }
  const milieu = xDebut + (xFin - xDebut) / 2 - 13;
  return (
    <>
      <line x1={xDebut} y1={y} x2={milieu} y2={y} stroke={COLORS.text} strokeWidth={1.3} />
      <PorteNON x={milieu} y={y} />
      <line x1={milieu + 32} y1={y} x2={xFin} y2={y} stroke={COLORS.text} strokeWidth={1.3} />
    </>
  );
}

function LogigrammeA({ entrees, inversion, gate1, gate2 }) {
  const Y_A = 28;
  const Y_B = 68;
  const Y_C = 132;
  const G1_X = 100;
  const G1_W = 56;
  const G1_TOP = 10;
  const G1_H = 76; // centre : 48
  const G1_OUT_Y = G1_TOP + G1_H / 2;
  const G2_X = 220;
  const G2_W = 56;
  const G2_TOP = 30;
  const G2_H = 90; // centre : 75
  const G2_PORT_HAUT = G1_OUT_Y; // aligné avec la sortie de la porte 1
  const G2_PORT_BAS = 102; // C remonte jusque là
  const G2_OUT_Y = G2_TOP + G2_H / 2;
  const S_X = 330;

  return (
    <svg width="100%" viewBox="0 0 360 160" style={{ display: "block" }}>
      <LigneHorizontale y={Y_A} xDebut={0} xFin={G1_X} inversee={inversion === "A"} />
      <text x={2} y={Y_A - 8} fontSize="11" fontWeight="700" fill={COLORS.accent}>A</text>

      <LigneHorizontale y={Y_B} xDebut={0} xFin={G1_X} inversee={inversion === "B"} />
      <text x={2} y={Y_B - 8} fontSize="11" fontWeight="700" fill={COLORS.accent}>B</text>

      <GateBox x={G1_X} y={G1_TOP} w={G1_W} h={G1_H} type={gate1} />

      <line x1={G1_X + G1_W} y1={G1_OUT_Y} x2={G2_X} y2={G2_PORT_HAUT} stroke={COLORS.text} strokeWidth={1.3} />

      <path
        d={`M 170 ${Y_C} V ${G2_PORT_BAS} H ${G2_X}`}
        fill="none"
        stroke={COLORS.text}
        strokeWidth={1.3}
      />
      <LigneHorizontale y={Y_C} xDebut={0} xFin={170} inversee={inversion === "C"} />
      <text x={2} y={Y_C - 8} fontSize="11" fontWeight="700" fill={COLORS.accent}>C</text>

      <GateBox x={G2_X} y={G2_TOP} w={G2_W} h={G2_H} type={gate2} />

      <line x1={G2_X + G2_W} y1={G2_OUT_Y} x2={S_X} y2={G2_OUT_Y} stroke={COLORS.text} strokeWidth={1.3} />
      <text x={S_X + 4} y={G2_OUT_Y + 4} fontSize="12" fontWeight="700">S</text>
    </svg>
  );
}

function LogigrammeB({ entrees, inversion, gate1, gate2, gate3 }) {
  const Y_A = 22;
  const Y_B = 62;
  const Y_C = 102;
  const Y_D = 142;
  const G1_X = 100;
  const G1_W = 56;
  const G1_TOP = 8;
  const G1_H = 70; // centre : 43
  const G1_OUT_Y = G1_TOP + G1_H / 2;
  const G2_X = 100;
  const G2_W = 56;
  const G2_TOP = 88;
  const G2_H = 70; // centre : 123
  const G2_OUT_Y = G2_TOP + G2_H / 2;
  const G3_X = 220;
  const G3_W = 56;
  const G3_TOP = 30;
  const G3_H = 106; // centre : 83, aligné sur aucune des deux entrées (coudes absorbés par la hauteur)
  const G3_OUT_Y = G3_TOP + G3_H / 2;
  const S_X = 330;

  return (
    <svg width="100%" viewBox="0 0 360 190" style={{ display: "block" }}>
      <LigneHorizontale y={Y_A} xDebut={0} xFin={G1_X} inversee={inversion === "A"} />
      <text x={2} y={Y_A - 7} fontSize="11" fontWeight="700" fill={COLORS.accent}>A</text>

      <LigneHorizontale y={Y_B} xDebut={0} xFin={G1_X} inversee={inversion === "B"} />
      <text x={2} y={Y_B - 7} fontSize="11" fontWeight="700" fill={COLORS.accent}>B</text>

      <GateBox x={G1_X} y={G1_TOP} w={G1_W} h={G1_H} type={gate1} />

      <LigneHorizontale y={Y_C} xDebut={0} xFin={G2_X} inversee={inversion === "C"} />
      <text x={2} y={Y_C - 7} fontSize="11" fontWeight="700" fill={COLORS.accent}>C</text>

      <LigneHorizontale y={Y_D} xDebut={0} xFin={G2_X} inversee={inversion === "D"} />
      <text x={2} y={Y_D - 7} fontSize="11" fontWeight="700" fill={COLORS.accent}>D</text>

      <GateBox x={G2_X} y={G2_TOP} w={G2_W} h={G2_H} type={gate2} />

      <line x1={G1_X + G1_W} y1={G1_OUT_Y} x2={G3_X} y2={G1_OUT_Y} stroke={COLORS.text} strokeWidth={1.3} />
      <line x1={G2_X + G2_W} y1={G2_OUT_Y} x2={G3_X} y2={G2_OUT_Y} stroke={COLORS.text} strokeWidth={1.3} />

      <GateBox x={G3_X} y={G3_TOP} w={G3_W} h={G3_H} type={gate3} />

      <line x1={G3_X + G3_W} y1={G3_OUT_Y} x2={S_X} y2={G3_OUT_Y} stroke={COLORS.text} strokeWidth={1.3} />
      <text x={S_X + 4} y={G3_OUT_Y + 4} fontSize="12" fontWeight="700">S</text>
    </svg>
  );
}

function Logigramme({ presentation }) {
  return presentation.topologie === "A" ? (
    <LogigrammeA {...presentation} />
  ) : (
    <LogigrammeB {...presentation} />
  );
}

// --- Rendu du schéma à contacts (contacts NO/NF, bobine) ------------------
// Plusieurs branches horizontales en parallèle, chacune avec ses contacts
// en série, toutes reliées à la même bobine "S" : la forme standard
// "somme de produits" des schémas à contacts. Un contact NF (normalement
// fermé, = négation) se dessine avec une barre oblique sur le symbole.

// Largeur occupée par le symbole d'un contact lui-même (hors espacement
// avec le contact suivant) : tout ce qui dépasse CONTACT_SYMBOLE_W doit être
// comblé par un connecteur explicite, sinon il manque un bout de fil entre
// deux contacts en série.
const CONTACT_SYMBOLE_W = 32;

function Contact({ x, y, label, inverse }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x + 10} y2={y} stroke={COLORS.text} strokeWidth={1.3} />
      <line x1={x + 10} y1={y - 5} x2={x + 10} y2={y + 5} stroke={COLORS.text} strokeWidth={1.3} />
      <line x1={x + 22} y1={y - 5} x2={x + 22} y2={y + 5} stroke={COLORS.text} strokeWidth={1.3} />
      {inverse && (
        <line x1={x + 9} y1={y + 6} x2={x + 23} y2={y - 6} stroke={COLORS.text} strokeWidth={1.3} />
      )}
      <line x1={x + 22} y1={y} x2={x + CONTACT_SYMBOLE_W} y2={y} stroke={COLORS.text} strokeWidth={1.3} />
      {/* Le nom reste le même, NO ou NF : à l'élève de repérer un contact NF
          au symbole (la barre oblique), pas à une étiquette qui le trahirait. */}
      <text x={x + 16} y={y - 9} fontSize="11" fontWeight="700" textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function SchemaContacts({ branches }) {
  const CONTACT_W = 54;
  const ROW_H = 42;
  const RAIL_X = 14;
  const START_X = 34;
  const maxContacts = Math.max(...branches.map((b) => b.length));
  const railDroiteX = START_X + maxContacts * CONTACT_W + 10;
  const coilX = railDroiteX + 40;
  const largeur = coilX + 60;
  const yHaut = 20;
  const yBas = 20 + (branches.length - 1) * ROW_H;
  const yMid = (yHaut + yBas) / 2;
  const hauteur = yBas + 20;

  return (
    <svg width="100%" viewBox={`0 0 ${largeur} ${hauteur}`} style={{ display: "block" }}>
      <line x1={RAIL_X} y1={yHaut} x2={RAIL_X} y2={yBas} stroke={COLORS.text} strokeWidth={1.5} />
      <line x1={railDroiteX} y1={yHaut} x2={railDroiteX} y2={yBas} stroke={COLORS.text} strokeWidth={1.5} />
      <line x1={railDroiteX} y1={yMid} x2={coilX - 14} y2={yMid} stroke={COLORS.text} strokeWidth={1.5} />
      <circle cx={coilX} cy={yMid} r={14} fill="none" stroke={COLORS.text} strokeWidth={1.5} />
      <line x1={coilX - 7} y1={yMid - 7} x2={coilX + 7} y2={yMid + 7} stroke={COLORS.text} strokeWidth={1.3} />
      <line x1={coilX - 7} y1={yMid + 7} x2={coilX + 7} y2={yMid - 7} stroke={COLORS.text} strokeWidth={1.3} />
      <text x={coilX + 22} y={yMid + 4} fontSize="12" fontWeight="700">
        S
      </text>

      {branches.map((branche, i) => {
        const y = yHaut + i * ROW_H;
        const finDerniereContact = START_X + (branche.length - 1) * CONTACT_W + CONTACT_SYMBOLE_W;
        return (
          <g key={i}>
            <line x1={RAIL_X} y1={y} x2={START_X} y2={y} stroke={COLORS.text} strokeWidth={1.3} />
            {branche.map((contact, j) => {
              const x = START_X + j * CONTACT_W;
              return (
                <g key={j}>
                  <Contact x={x} y={y} label={contact.lettre} inverse={contact.inv} />
                  {/* Connecteur vers le contact suivant de la même branche —
                      sans lui, il manquait un segment de fil entre deux
                      contacts en série. */}
                  {j < branche.length - 1 && (
                    <line
                      x1={x + CONTACT_SYMBOLE_W}
                      y1={y}
                      x2={x + CONTACT_W}
                      y2={y}
                      stroke={COLORS.text}
                      strokeWidth={1.3}
                    />
                  )}
                </g>
              );
            })}
            <line x1={finDerniereContact} y1={y} x2={railDroiteX} y2={y} stroke={COLORS.text} strokeWidth={1.3} />
          </g>
        );
      })}
    </svg>
  );
}

// --- Rendu de la présentation de l'exercice -------------------------------
// "chronogramme" : un relevé de signal (trame série). "logigramme" : un
// schéma à base de portes ET/OU/NON. "schema-contacts" : un schéma à
// contacts (NO/NF) et bobine. "texte" : un énoncé textuel (cahier des
// charges, circuit électrique...) — si l'exercice le demande (ex. faire un
// schéma sur papier), presentation.avertissement porte le rappel à
// afficher ; sinon aucun bandeau n'apparaît.

function Presentation({ presentation }) {
  if (presentation.kind === "schema-contacts") {
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
          Schéma à contacts — retrouve l'équation booléenne correspondante :
        </div>
        <div style={{ overflowX: "auto" }}>
          <SchemaContacts branches={presentation.branches} />
        </div>
      </div>
    );
  }

  if (presentation.kind === "logigramme") {
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
          Logigramme — retrouve l'équation booléenne correspondante :
        </div>
        <div style={{ overflowX: "auto" }}>
          <Logigramme presentation={presentation} />
        </div>
      </div>
    );
  }

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

  if (presentation.kind === "chronogramme-logique") {
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
        <div style={{ fontSize: 12, color: COLORS.text2, marginBottom: 2 }}>
          Équation à appliquer aux signaux d'entrée :
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 14,
            fontWeight: 700,
            color: COLORS.accent,
            marginBottom: 12,
          }}
        >
          {presentation.equation}
        </div>
        <div style={{ overflowX: "auto" }}>
          <ChronogrammeEntrees entrees={presentation.entrees} trames={presentation.trames} />
        </div>
      </div>
    );
  }

  if (presentation.kind === "texte") {
    return (
      <>
        {presentation.avertissement && (
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
            {presentation.avertissement}
          </div>
        )}
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
  referentielNom,
  sousCompetencesLieesIds = [],
  streakInitial,
  valideInitial,
  // Mode test (prof) : rien n'est enregistré en base — le streak reste
  // purement local le temps de la session, pour vérifier l'enchaînement
  // sans jamais toucher à remediation_progres ni à la progression d'un
  // élève. retourHref/retourLabel permettent de renvoyer vers la bonne
  // page selon qui regarde (élève ou prof).
  modeTest = false,
  retourHref = "/dashboard/eleve",
  retourLabel = "Retour à mes compétences",
}) {
  // Les codes de sous-compétence ne sont uniques qu'au sein d'un référentiel
  // (voir registre.js) : on ne va donc chercher le générateur que dans celui
  // de cette sous-compétence, jamais par le seul code.
  const generateur = (GENERATEURS[referentielNom] || {})[sousCompetence.code];

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
          <Link href={retourHref} style={{ fontSize: 12, color: COLORS.accent }}>
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

    if (modeTest) {
      // Rien n'est écrit en base : le streak ne vit que dans cet écran.
      const nouveauStreak = reussie ? streak + 1 : 0;
      setStreak(nouveauStreak);
      setValide(nouveauStreak >= OBJECTIF_STREAK);
      setResultat({ reussie });
      return;
    }

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
        <Link href={retourHref} style={{ fontSize: 12, color: COLORS.accent }}>
          &larr; {retourLabel}
        </Link>

        <h1 style={{ fontSize: 18, fontWeight: 700, margin: "12px 0 4px" }}>
          {sousCompetence.code} — {sousCompetence.intitule}
        </h1>
        <p style={{ fontSize: 13, color: COLORS.text2, margin: "0 0 16px" }}>
          Réussis {OBJECTIF_STREAK} exercices d'affilée pour valider la compétence
          {sousCompetencesLieesIds.length > 0 ? " (cet exercice valide aussi une compétence liée)" : ""}.
        </p>

        {modeTest && (
          <div
            style={{
              background: COLORS.orangeBg,
              border: `1px solid ${COLORS.orange}44`,
              borderRadius: 10,
              padding: "8px 12px",
              marginBottom: 16,
              fontSize: 12,
              color: COLORS.orange,
              fontWeight: 600,
            }}
          >
            Mode test — rien n'est enregistré, ni pour toi ni pour un élève.
          </div>
        )}

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

        {exercice.questions.map((q, i) => {
          const QuestionComposant = q.rendu === "chronogramme" ? QuestionQCMChronogramme : QuestionQCM;
          return (
            <QuestionComposant
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
          );
        })}

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

// Variante graphique du QCM (C1-7) : chaque option est un chronogramme
// (une trame encodée en chaîne "1,0,0,1,...") au lieu d'un texte. Même
// logique de sélection/correction que QuestionQCM — seul le rendu du
// bouton change : le tracé SVG utilise stroke="currentColor", donc il
// prend automatiquement la couleur de texte du bouton (vert/rouge/accent).
function QuestionQCMChronogramme({ label, options, valeur, onChange, desactive, correcte, afficherCorrection }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((opt) => {
          const selectionne = valeur === opt;
          const estCorrecte = afficherCorrection && opt === correcte;
          const estMauvaiseSelection = afficherCorrection && selectionne && opt !== correcte;
          const trame = opt.split(",").map(Number);
          return (
            <button
              key={opt}
              type="button"
              disabled={desactive}
              onClick={() => onChange(opt)}
              style={{
                textAlign: "left",
                padding: "8px 12px",
                borderRadius: 8,
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
              <MiniChronogrammeOption trame={trame} />
            </button>
          );
        })}
      </div>
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
