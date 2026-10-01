// Génération d'exercice de remédiation : loi des nœuds, loi des mailles,
// loi d'Ohm (C2-0). Deux types de circuits tirés au hasard, décrits par
// texte (l'élève fait le schéma lui-même sur papier — voir la consigne
// affichée par l'écran). Module "plain JS" (pas de React).

const RESISTANCES = [100, 150, 220, 330, 470, 560, 680, 820, 1000, 1200, 1500, 1800, 2200];
const TENSIONS = [6, 9, 12, 18, 24];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickDeuxDistinctes(arr) {
  const a = pick(arr);
  let b = pick(arr);
  while (b === a) b = pick(arr);
  return [a, b];
}

function melanger(arr) {
  const copie = [...arr];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function formatMA(x) {
  return `${round2(x).toFixed(2)} mA`;
}

function formatV(x) {
  return `${round2(x).toFixed(2)} V`;
}

// Construit 4 options uniques (la bonne + 3 distracteurs), à partir d'une
// liste de valeurs "erreurs classiques" candidates. Complète avec des
// valeurs de secours si des candidats coïncident entre eux.
function construireOptions(correct, candidats) {
  const c = round2(correct);
  const autres = [];
  for (const cand of candidats) {
    const v = round2(cand);
    if (v !== c && !autres.some((a) => Math.abs(a - v) < 0.005)) autres.push(v);
    if (autres.length === 3) break;
  }
  let i = 1;
  while (autres.length < 3) {
    const pas = c === 0 ? i : Math.abs(c) * 0.3 * i;
    const filler = round2(c + pas);
    if (filler !== c && !autres.some((a) => Math.abs(a - filler) < 0.005)) autres.push(filler);
    i++;
  }
  return melanger([c, ...autres]);
}

function genererTypeNoeuds() {
  const E = pick(TENSIONS);
  const [R1, R2] = pickDeuxDistinctes(RESISTANCES);
  const I1 = (E / R1) * 1000;
  const I2 = (E / R2) * 1000;
  const Itotal = I1 + I2;

  const optsI1 = construireOptions(I1, [(E / R2) * 1000, (E * R1) / 1000, I1 / 2, I1 * 2]);
  const optsI2 = construireOptions(I2, [(E / R1) * 1000, (E * R2) / 1000, I2 / 2, I2 * 2]);
  const optsItot = construireOptions(Itotal, [Math.abs(I1 - I2), I1, I2, Itotal / 2]);

  return {
    presentation: {
      kind: "texte",
      enonce: `Une source de tension E = ${E} V est branchée directement sur deux résistances R1 = ${R1} Ω et R2 = ${R2} Ω, montées en parallèle (un seul nœud, deux branches).`,
      avertissement:
        "⚠️ Fais le schéma de ce circuit sur une feuille avant de répondre — c'est indispensable pour bien repérer le(s) nœud(s) et la (les) maille(s).",
    },
    questions: [
      { label: "Courant I1 dans R1", options: optsI1.map(formatMA), correcte: formatMA(I1) },
      { label: "Courant I2 dans R2", options: optsI2.map(formatMA), correcte: formatMA(I2) },
      {
        label: "Courant total I délivré par la source",
        options: optsItot.map(formatMA),
        correcte: formatMA(Itotal),
      },
    ],
  };
}

function genererTypeMailles() {
  const E = pick(TENSIONS);
  const [R1, R2] = pickDeuxDistinctes(RESISTANCES);
  const I = (E / (R1 + R2)) * 1000;
  const U1 = (E / (R1 + R2)) * R1;
  const U2 = (E / (R1 + R2)) * R2;

  const optsI = construireOptions(I, [
    (E / R1) * 1000,
    (E / R2) * 1000,
    (E / Math.abs(R1 - R2)) * 1000,
    I / 2,
  ]);
  const optsU1 = construireOptions(U1, [U2, E, U1 * 2, U1 / 2]);
  const optsU2 = construireOptions(U2, [U1, E, U2 * 2, U2 / 2]);

  return {
    presentation: {
      kind: "texte",
      enonce: `Une source de tension E = ${E} V est en série avec deux résistances R1 = ${R1} Ω et R2 = ${R2} Ω (une seule maille, pas de branchement).`,
      avertissement:
        "⚠️ Fais le schéma de ce circuit sur une feuille avant de répondre — c'est indispensable pour bien repérer le(s) nœud(s) et la (les) maille(s).",
    },
    questions: [
      { label: "Courant I dans la maille", options: optsI.map(formatMA), correcte: formatMA(I) },
      { label: "Tension U1 aux bornes de R1", options: optsU1.map(formatV), correcte: formatV(U1) },
      { label: "Tension U2 aux bornes de R2", options: optsU2.map(formatV), correcte: formatV(U2) },
    ],
  };
}

export function genererLoisElectrocinetique() {
  return Math.random() < 0.5 ? genererTypeNoeuds() : genererTypeMailles();
}
