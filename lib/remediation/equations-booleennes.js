// Génération d'exercice de remédiation : écrire les équations booléennes
// d'un système (ET, OU, NON) à partir d'un énoncé (C1-2, BTS CRSA). Un petit
// système à 2 entrées est tiré au hasard, et l'élève doit retrouver, pour 3
// conditions tirées au hasard parmi ET / OU / NON, l'équation qui correspond
// — parmi des distracteurs construits sur les erreurs classiques (opérateur
// inversé, négation oubliée ou mal placée). Module "plain JS".

const SYSTEMES = [
  {
    contexte:
      "une porte de garage automatique, pilotée par deux entrées : a = le capteur de présence sous la porte, b = le bouton d'ouverture",
    nomA: "le capteur de présence",
    nomB: "le bouton d'ouverture",
  },
  {
    contexte:
      "un convoyeur de tri, piloté par deux entrées : a = le détecteur de colis, b = le capteur de bourrage",
    nomA: "le détecteur de colis",
    nomB: "le capteur de bourrage",
  },
  {
    contexte:
      "une pompe de remplissage, pilotée par deux entrées : a = le capteur de niveau bas, b = le bouton de démarrage manuel",
    nomA: "le capteur de niveau bas",
    nomB: "le bouton de démarrage manuel",
  },
  {
    contexte:
      "un portail coulissant, piloté par deux entrées : a = la télécommande, b = le capteur de fin de course",
    nomA: "la télécommande",
    nomB: "le capteur de fin de course",
  },
  {
    contexte:
      "une chaîne d'embouteillage, pilotée par deux entrées : a = le capteur de présence de bouteille, b = le détecteur de niveau de remplissage",
    nomA: "le capteur de présence de bouteille",
    nomB: "le détecteur de niveau de remplissage",
  },
];

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

// Tire n opérations distinctes parmi la liste des générateurs ci-dessous.
function pickNDistincts(arr, n) {
  return melanger(arr).slice(0, n);
}

// Chaque générateur reçoit {nomA, nomB} et renvoie {label, correcte, distracteurs}.
const OPERATIONS = [
  ({ nomA, nomB }) => ({
    label: `${nomA} ET ${nomB} actifs en même temps : sortie active seulement si les deux conditions sont réunies ensemble.`,
    correcte: "S = a.b",
    distracteurs: ["S = a+b", "S = a", "S = b"],
  }),
  ({ nomA, nomB }) => ({
    label: `${nomA} OU ${nomB} actif : sortie active dès qu'au moins une des deux conditions est vraie.`,
    correcte: "S = a+b",
    distracteurs: ["S = a.b", "S = a", "S = b"],
  }),
  ({ nomA }) => ({
    label: `${nomA} inactif : sortie active uniquement quand cette entrée est à l'état 0 (absence de signal).`,
    correcte: "S = /a",
    distracteurs: ["S = a", "S = /b", "S = a.b"],
  }),
  ({ nomB }) => ({
    label: `${nomB} inactif : sortie active uniquement quand cette entrée est à l'état 0 (absence de signal).`,
    correcte: "S = /b",
    distracteurs: ["S = b", "S = /a", "S = a+b"],
  }),
];

export function genererEquationsBooleennes() {
  const systeme = pick(SYSTEMES);
  const generateursChoisis = pickNDistincts(OPERATIONS, 3);

  return {
    presentation: {
      kind: "texte",
      enonce: `Cahier des charges : ${systeme.contexte}. Notation utilisée : "a.b" pour ET, "a+b" pour OU, "/a" pour NON a.`,
    },
    questions: generateursChoisis.map((generer) => {
      const { label, correcte, distracteurs } = generer(systeme);
      return {
        label,
        options: melanger([correcte, ...distracteurs]),
        correcte,
      };
    }),
  };
}
