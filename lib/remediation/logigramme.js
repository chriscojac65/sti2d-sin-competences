// Génération d'exercice de remédiation : retrouver l'équation booléenne à
// partir d'un logigramme (portes ET, OU, NON) (C1-5, BTS CRSA). Le
// logigramme est dessiné avec les symboles normalisés vus en cours : "&"
// pour une porte ET, "≥1" pour une porte OU, "1" avec une bulle en sortie
// pour une porte NON (buffer inverseur). Deux structures tirées au hasard :
// - topologie "A" (3 entrées A, B, C) : une porte combine A et B, sa sortie
//   se combine avec C dans une seconde porte ;
// - topologie "B" (4 entrées A, B, C, D) : deux portes combinent chacune
//   une paire d'entrées, puis une troisième porte combine leurs deux
//   sorties.
// Une inversion (porte NON) est parfois insérée sur l'une des entrées
// brutes, avant qu'elle n'entre dans sa porte. Les distracteurs reprennent
// les erreurs classiques (porte inversée, négation oubliée ou déplacée).
// Le dessin du logigramme est fait par RemediationScreen.js, qui lit
// directement les champs de presentation (topologie, entrees, inversion,
// gate1, gate2, gate3) — ce module ne fournit que la structure et le texte.

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

// "a" ou "/a" selon que cette entrée est celle qui est inversée.
function lettre(nom, inversion) {
  return inversion === nom ? `/${nom.toLowerCase()}` : nom.toLowerCase();
}

// Combine deux membres avec ET (".") ou OU ("+").
function combiner(gauche, droite, type) {
  return type === "ET" ? `${gauche}.${droite}` : `${gauche}+${droite}`;
}

function construireEquationA({ inversion, gate1, gate2 }) {
  const a = lettre("A", inversion);
  const b = lettre("B", inversion);
  const c = lettre("C", inversion);
  const x = combiner(a, b, gate1);
  // On parenthèse dès que la première porte est un OU, pour que
  // l'équation reste toujours juste quelle que soit la seconde porte (le
  // ET étant prioritaire sur le OU, "a+b" combiné en ET avec c doit
  // s'écrire "(a+b).c" et non "a+b.c").
  const xAffiche = gate1 === "OU" ? `(${x})` : x;
  return `S = ${combiner(xAffiche, c, gate2)}`;
}

function construireEquationB({ inversion, gate1, gate2, gate3 }) {
  const a = lettre("A", inversion);
  const b = lettre("B", inversion);
  const c = lettre("C", inversion);
  const d = lettre("D", inversion);
  const x = combiner(a, b, gate1);
  const y = combiner(c, d, gate2);
  // Les deux sous-expressions sont toujours parenthésées : chacune peut
  // utiliser un opérateur différent de la troisième porte, donc les
  // parenthèses sont systématiquement nécessaires pour rester justes.
  return `S = (${x})${gate3 === "ET" ? "." : "+"}(${y})`;
}

function genererTopologieA() {
  const entrees = ["A", "B", "C"];
  const inversion = Math.random() < 0.5 ? pick(entrees) : null;
  const gate1 = pick(["ET", "OU"]);
  const gate2 = pick(["ET", "OU"]);
  const equation = construireEquationA({ inversion, gate1, gate2 });
  return { topologie: "A", entrees, inversion, gate1, gate2, equation };
}

function genererTopologieB() {
  const entrees = ["A", "B", "C", "D"];
  const inversion = Math.random() < 0.5 ? pick(entrees) : null;
  const gate1 = pick(["ET", "OU"]);
  const gate2 = pick(["ET", "OU"]);
  const gate3 = pick(["ET", "OU"]);
  const equation = construireEquationB({ inversion, gate1, gate2, gate3 });
  return { topologie: "B", entrees, inversion, gate1, gate2, gate3, equation };
}

// Construit jusqu'à 3 équations fausses mais plausibles, en modifiant un
// seul élément de la structure correcte à la fois (porte inversée,
// négation oubliée ou déplacée sur une autre entrée) — jamais l'équation
// strictement correcte.
function genererDistracteurs(structure) {
  const variantes = new Set();
  const autre = (t) => (t === "ET" ? "OU" : "ET");

  function ajouter(construire) {
    const eq = construire();
    if (eq && eq !== structure.equation) variantes.add(eq);
  }

  if (structure.topologie === "A") {
    const { entrees, inversion, gate1, gate2 } = structure;
    const autresEntrees = entrees.filter((e) => e !== inversion);

    ajouter(() => construireEquationA({ inversion, gate1: autre(gate1), gate2 }));
    ajouter(() => construireEquationA({ inversion, gate1, gate2: autre(gate2) }));
    ajouter(() => construireEquationA({ inversion, gate1: autre(gate1), gate2: autre(gate2) }));
    if (inversion) ajouter(() => construireEquationA({ inversion: null, gate1, gate2 }));
    ajouter(() => construireEquationA({ inversion: pick(autresEntrees), gate1, gate2 }));
  } else {
    const { entrees, inversion, gate1, gate2, gate3 } = structure;
    const autresEntrees = entrees.filter((e) => e !== inversion);

    ajouter(() => construireEquationB({ inversion, gate1: autre(gate1), gate2, gate3 }));
    ajouter(() => construireEquationB({ inversion, gate1, gate2: autre(gate2), gate3 }));
    ajouter(() => construireEquationB({ inversion, gate1, gate2, gate3: autre(gate3) }));
    if (inversion) ajouter(() => construireEquationB({ inversion: null, gate1, gate2, gate3 }));
    ajouter(() => construireEquationB({ inversion: pick(autresEntrees), gate1, gate2, gate3 }));
  }

  return melanger([...variantes]).slice(0, 3);
}

export function genererLogigramme() {
  const structure = Math.random() < 0.5 ? genererTopologieA() : genererTopologieB();
  const distracteurs = genererDistracteurs(structure);

  // Cas très rare où la structure tirée ne laisse pas assez de variantes
  // distinctes pour 3 distracteurs : on retire simplement et on retire au
  // sort une nouvelle structure.
  if (distracteurs.length < 3) {
    return genererLogigramme();
  }

  return {
    presentation: {
      kind: "logigramme",
      topologie: structure.topologie,
      entrees: structure.entrees,
      inversion: structure.inversion,
      gate1: structure.gate1,
      gate2: structure.gate2,
      gate3: structure.gate3 || null,
    },
    questions: [
      {
        label: "Quelle équation correspond à la sortie S de ce logigramme ?",
        options: melanger([structure.equation, ...distracteurs]),
        correcte: structure.equation,
      },
    ],
  };
}
