// Génération d'exercice de remédiation : calculer la fréquence de coupure d'un
// filtre RC passe-bas, fc = 1 / (2πRC) — C2-6. Trois questions guidées :
// capacité en farads (piège des préfixes µ / n), produit RC, puis fc. Les
// résistances et condensateurs sont tirés pour que fc reste entre 10 Hz et
// 10 kHz. Module "plain JS" (pas de React).

const RESISTANCES = [47, 100, 220, 330, 470, 680, 1000, 2200, 4700, 10000, 22000, 33000, 47000, 100000];
// [valeur affichée, exposant (puissance de 10 en farad), texte d'unité]
const CONDENSATEURS = [
  [10, -9, "nF"],
  [22, -9, "nF"],
  [47, -9, "nF"],
  [100, -9, "nF"],
  [220, -9, "nF"],
  [470, -9, "nF"],
  [1, -6, "µF"],
  [2.2, -6, "µF"],
  [4.7, -6, "µF"],
  [10, -6, "µF"],
  [22, -6, "µF"],
  [47, -6, "µF"],
  [100, -6, "µF"],
];

const EXPOSANTS = { "-3": "⁻³", "-6": "⁻⁶", "-9": "⁻⁹", "-12": "⁻¹²" };

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

function virgule(n) {
  return String(n).replace(".", ",");
}

function formatR(r) {
  return r >= 1000 ? `${virgule(r / 1000)} kΩ` : `${r} Ω`;
}

function formatC(c) {
  return `${virgule(c[0])} ${c[2]}`;
}

function chiffresSignificatifs(x, n = 3) {
  return Number(x.toPrecision(n));
}

function formatDuree(s) {
  if (s >= 1) return `${virgule(chiffresSignificatifs(s))} s`;
  if (s >= 1e-3) return `${virgule(chiffresSignificatifs(s * 1e3))} ms`;
  return `${virgule(chiffresSignificatifs(s * 1e6))} µs`;
}

function formatFrequence(f) {
  if (f >= 1000) return `${virgule(chiffresSignificatifs(f / 1000))} kHz`;
  return `${virgule(chiffresSignificatifs(f))} Hz`;
}

function formatFarad(mantisse, exposant) {
  return `${virgule(mantisse)} × 10${EXPOSANTS[String(exposant)]} F`;
}

function distinctes(correct, candidats, formater, secours) {
  const resultat = [];
  for (const c of [...candidats, ...secours]) {
    const t = formater(c);
    if (t !== correct && !resultat.includes(t)) resultat.push(t);
    if (resultat.length === 3) break;
  }
  return resultat;
}

export function genererCalculFc() {
  let R;
  let C;
  let fc;
  do {
    R = pick(RESISTANCES);
    C = pick(CONDENSATEURS);
    fc = 1 / (2 * Math.PI * R * C[0] * 10 ** C[1]);
  } while (fc < 10 || fc > 10000);

  const tau = R * C[0] * 10 ** C[1];

  // Q1 : C en farads (distracteurs : mauvais préfixe)
  const correct1 = formatFarad(C[0], C[1]);
  const opts1 = [-3, -6, -9, -12]
    .filter((e) => e !== C[1])
    .slice(0, 3)
    .map((e) => formatFarad(C[0], e));

  // Q2 : produit RC (distracteurs : erreurs de puissance de 10)
  const correct2 = formatDuree(tau);
  const opts2 = distinctes(correct2, [tau * 1e3, tau / 1e3, tau * 1e6, tau / 1e6, tau * 10, tau / 10], formatDuree, [tau * 100]);

  // Q3 : fc (distracteurs : oubli du 2π, π à la place de 2π, erreur de puissance de 10)
  const correct3 = formatFrequence(fc);
  const opts3 = distinctes(
    correct3,
    [fc * 2 * Math.PI, fc * Math.PI, fc * 1000, fc / 1000, fc * 10, fc / 10],
    formatFrequence,
    [fc * 4]
  );

  return {
    presentation: {
      kind: "filtre-rc",
      R: formatR(R),
      C: formatC(C),
      enonce: "Filtre RC passe-bas. Fréquence de coupure : fc = 1 / (2 × π × R × C), avec R en ohms (Ω), C en farads (F) et fc en hertz (Hz).",
    },
    questions: [
      { label: "Capacité C exprimée en farads", options: melanger([correct1, ...opts1]), correcte: correct1 },
      { label: "Produit R × C (R en Ω, C en F)", options: melanger([correct2, ...opts2]), correcte: correct2 },
      { label: "Fréquence de coupure fc", options: melanger([correct3, ...opts3]), correcte: correct3 },
    ],
  };
}
