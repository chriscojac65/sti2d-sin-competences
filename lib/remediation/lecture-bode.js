// Génération d'exercice de remédiation : déterminer la fréquence de coupure
// d'un filtre passe-bas sur une courbe de Bode (échelle logarithmique) — C2-7.
// Trois questions guidées : gain du palier, gain à lire pour fc (palier - 3 dB),
// puis fréquence de coupure. Le palier est tiré parmi 0, 6, 10 ou 20 dB pour
// retrouver le piège de l'évaluation (palier à +10 dB : fc ne se lit PAS à -3 dB
// absolu). Module "plain JS" (pas de React).

const PALIERS = [0, 6, 10, 20];
const FREQUENCES_COUPURE = [150, 250, 400, 600, 1000, 1500, 2500, 4000];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function melanger(arr) {
  const copie = [...arr];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

function formatDB(g) {
  return `${g < 0 ? "−" : ""}${Math.abs(g)} dB`;
}

function arrondir2chiffres(f) {
  const ordre = 10 ** (Math.floor(Math.log10(f)) - 1);
  return Math.round(f / ordre) * ordre;
}

function formatHz(f) {
  const v = arrondir2chiffres(f);
  if (v >= 1000) {
    const k = v / 1000;
    return `${String(Number.isInteger(k) ? k : k.toFixed(1).replace(/\.0$/, "")).replace(".", ",")} kHz`;
  }
  return `${v} Hz`;
}

// Garde 3 distracteurs distincts de la bonne réponse, parmi des candidats
// classés par ordre de préférence ; complète avec des valeurs de secours.
function distracteurs(correctTexte, candidats, secours, formater) {
  const resultat = [];
  for (const c of [...candidats, ...secours]) {
    const texte = formater(c);
    if (texte !== correctTexte && !resultat.includes(texte)) resultat.push(texte);
    if (resultat.length === 3) break;
  }
  return resultat;
}

export function genererLectureBode() {
  const palier = pick(PALIERS);
  const fc = pick(FREQUENCES_COUPURE);
  const gainFc = palier - 3;

  // Q1 : gain du palier
  const correct1 = formatDB(palier);
  const opts1 = distracteurs(
    correct1,
    [palier - 3, palier + 3, palier === 0 ? 10 : 0, palier + 10, palier - 10],
    [3, 6, 12, 15],
    formatDB
  );

  // Q2 : gain auquel se lit fc (palier - 3 dB) ; piège : -3 dB absolu
  const correct2 = formatDB(gainFc);
  const opts2 = distracteurs(
    correct2,
    [-3, palier, palier - 6, palier - 10, palier + 3],
    [-6, 0, 3, 6],
    formatDB
  );

  // Q3 : fc ; erreurs classiques
  const correct3 = formatHz(fc);
  // fréquence où le gain vaut -3 dB en valeur absolue (piège du palier non nul)
  const fAbs = fc * Math.sqrt(10 ** ((palier + 3) / 10) - 1);
  // fréquence où la courbe croise 0 dB (palier non nul)
  const fZero = palier > 0 ? fc * Math.sqrt(10 ** (palier / 10) - 1) : fc * 3;
  const candidats3 = [fAbs, fc / 3, fc * 10, fc / 10, fZero, fc * 2, fc / 2];
  const opts3 = distracteurs(correct3, candidats3.filter((f) => f >= 10 && f <= 1e5), [fc * 4, fc / 4, fc * 5], formatHz);

  return {
    presentation: {
      kind: "bode",
      palier,
      fc,
      enonce:
        "Courbe de gain d'un filtre passe-bas (échelle de fréquence logarithmique). Rappel : à la fréquence de coupure fc, le gain a perdu 3 dB par rapport au palier.",
    },
    questions: [
      { label: "Gain du palier (basses fréquences)", options: melanger([correct1, ...opts1]), correcte: correct1 },
      { label: "Gain auquel se situe la fréquence de coupure fc", options: melanger([correct2, ...opts2]), correcte: correct2 },
      { label: "Fréquence de coupure fc lue sur la courbe", options: melanger([correct3, ...opts3]), correcte: correct3 },
    ],
  };
}
