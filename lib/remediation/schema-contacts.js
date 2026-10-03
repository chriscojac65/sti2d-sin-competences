// Génération d'exercice de remédiation : retrouver l'équation booléenne à
// partir d'un schéma à contacts (contacts NO/NF, bobine) (C1-6, BTS CRSA) —
// en miroir du logigramme (C1-5). Un contact "normal" (NO, normalement
// ouvert) correspond à une variable (a, b, c...) ; un contact "NF"
// (normalement fermé) correspond à sa négation (/a) et se dessine avec une
// barre oblique sur le symbole. Plusieurs contacts en série sur une même
// ligne forment un ET ; plusieurs lignes en parallèle, reliées à la même
// bobine, forment un OU — c'est la forme standard "somme de produits"
// enseignée pour les schémas à contacts. Le dessin est fait par
// RemediationScreen.js (presentation.kind === "schema-contacts"), qui lit
// directement le tableau de branches fourni ici.

const LETTRES = ["a", "b", "c", "d", "e"];

// Chaque "forme" répartit un nombre de contacts en branches parallèles,
// chaque branche étant elle-même une série de contacts. Une branche en
// série peut aller jusqu'à 5 contacts (demande explicite : "on peut aller
// au delà de 3 contacts, disons 5 maximum").
const FORMES = [
  { lettres: 3, branches: [3] }, // tout en série : a.b.c
  { lettres: 3, branches: [2, 1] }, // (a.b) + c
  { lettres: 3, branches: [1, 1, 1] }, // a + b + c
  { lettres: 4, branches: [2, 2] }, // a.b + c.d
  { lettres: 4, branches: [4] }, // a.b.c.d
  { lettres: 4, branches: [3, 1] }, // (a.b.c) + d
  { lettres: 5, branches: [5] }, // a.b.c.d.e
  { lettres: 5, branches: [4, 1] }, // (a.b.c.d) + e
  { lettres: 5, branches: [3, 2] }, // (a.b.c) + (d.e)
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

// Construit les branches (avec inversions) à partir d'une forme. Si
// `inversions` est fourni (un Set de lettres), ces lettres-là sont
// inversées plutôt que de tirer au hasard — utilisé pour garder les mêmes
// inversions d'un distracteur à l'autre quand seule la forme change.
function construireBranches(forme, inversions) {
  const lettres = LETTRES.slice(0, forme.lettres);
  let i = 0;
  return forme.branches.map((taille) =>
    Array.from({ length: taille }, () => {
      const lettre = lettres[i];
      i++;
      const inv = inversions ? inversions.has(lettre) : Math.random() < 0.35;
      return { lettre, inv };
    })
  );
}

function equationDeBranches(branches) {
  return (
    "S = " +
    branches
      .map((branche) => branche.map((c) => (c.inv ? `/${c.lettre}` : c.lettre)).join("."))
      .join("+")
  );
}

export function genererSchemaContacts() {
  const forme = pick(FORMES);
  const branches = construireBranches(forme);
  const equation = equationDeBranches(branches);

  const variantes = new Set();
  function ajouter(brs) {
    const eq = equationDeBranches(brs);
    if (eq !== equation) variantes.add(eq);
  }

  // 1) une forme différente, à nombre de contacts égal, en gardant les
  // mêmes inversions (erreur classique : confondre série et parallèle).
  const inversionsActuelles = new Set(branches.flat().filter((c) => c.inv).map((c) => c.lettre));
  const formesAlternatives = FORMES.filter((f) => f.lettres === forme.lettres && f !== forme);
  for (const alt of formesAlternatives) {
    ajouter(construireBranches(alt, inversionsActuelles));
  }

  // 2) une négation oubliée ou déplacée sur un autre contact.
  for (let essai = 0; essai < 4 && variantes.size < 3; essai++) {
    const copie = branches.map((b) => b.map((c) => ({ ...c })));
    const toutes = copie.flat();
    const cible = pick(toutes);
    cible.inv = !cible.inv;
    ajouter(copie);
  }

  // 3) deux négations changées à la fois (variante plus éloignée).
  for (let essai = 0; essai < 4 && variantes.size < 3; essai++) {
    const copie = branches.map((b) => b.map((c) => ({ ...c })));
    const toutes = copie.flat();
    const cible1 = pick(toutes);
    cible1.inv = !cible1.inv;
    const reste = toutes.filter((c) => c !== cible1);
    const cible2 = reste.length ? pick(reste) : null;
    if (cible2) cible2.inv = !cible2.inv;
    ajouter(copie);
  }

  const distracteurs = melanger([...variantes]).slice(0, 3);
  if (distracteurs.length < 3) {
    // Cas très rare où la forme tirée ne laisse pas assez de variantes.
    return genererSchemaContacts();
  }

  return {
    presentation: {
      kind: "schema-contacts",
      branches,
    },
    questions: [
      {
        label: "Quelle équation correspond à ce schéma à contacts ?",
        options: melanger([equation, ...distracteurs]),
        correcte: equation,
      },
    ],
  };
}
