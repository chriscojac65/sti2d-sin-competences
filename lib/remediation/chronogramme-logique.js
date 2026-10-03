// Génération d'exercice de remédiation : compléter un chronogramme à partir
// d'une équation logique et des chronogrammes d'entrée (C1-7, BTS CRSA) —
// en miroir du logigramme (C1-5) et du schéma à contacts (C1-6), mais ici on
// donne l'équation ET les signaux d'entrée A, B, C, et il faut retrouver le
// chronogramme de sortie S. Comme il n'est pas possible de faire tracer un
// signal à main levée dans un QCM web, l'élève choisit le bon chronogramme
// de S parmi 4 propositions dessinées (lecture plutôt que tracé) :
// RemediationScreen.js dessine à la fois les entrées (presentation.trames)
// et chaque option de réponse (question.options, chacune une trame de même
// longueur), ce module ne fournit que les structures de bits.
//
// Équation à deux portes en cascade (même forme que la topologie A du
// logigramme) : S = (A op1 B) op2 C, avec une inversion possible sur une
// seule des trois entrées.

const LONGUEUR = 8;

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

// Trame aléatoire, mais jamais constante (sinon aucune information
// temporelle à lire) : au moins un front dans les LONGUEUR divisions.
function trameAleatoire() {
  let trame;
  do {
    trame = Array.from({ length: LONGUEUR }, () => (Math.random() < 0.5 ? 0 : 1));
  } while (trame.every((b) => b === trame[0]));
  return trame;
}

function lettre(nom, inversion) {
  return inversion === nom ? `/${nom.toLowerCase()}` : nom.toLowerCase();
}

function combiner(gauche, droite, type) {
  return type === "ET" ? `${gauche}.${droite}` : `${gauche}+${droite}`;
}

function construireEquation({ inversion, gate1, gate2 }) {
  const a = lettre("A", inversion);
  const b = lettre("B", inversion);
  const c = lettre("C", inversion);
  const x = combiner(a, b, gate1);
  const xAffiche = gate1 === "OU" ? `(${x})` : x;
  return `S = ${combiner(xAffiche, c, gate2)}`;
}

function evaluerBit(a, b, c, { inversion, gate1, gate2 }) {
  const av = inversion === "A" ? 1 - a : a;
  const bv = inversion === "B" ? 1 - b : b;
  const cv = inversion === "C" ? 1 - c : c;
  const x = gate1 === "ET" ? av && bv : av || bv;
  const s = gate2 === "ET" ? (x ? 1 : 0) && cv : (x ? 1 : 0) || cv;
  return s ? 1 : 0;
}

function calculerTrameS(trames, structure) {
  return trames.A.map((_, i) => evaluerBit(trames.A[i], trames.B[i], trames.C[i], structure));
}

function trameVersCle(trame) {
  return trame.join(",");
}

// Décale le signal d'une division vers la droite (le front arrive "en
// retard") — erreur classique de lecture : répète le premier état au lieu
// de le décaler de rien.
function decaler(trame) {
  return [trame[0], ...trame.slice(0, -1)];
}

export function genererChronogrammeLogique() {
  const entrees = ["A", "B", "C"];
  const trames = { A: trameAleatoire(), B: trameAleatoire(), C: trameAleatoire() };

  const inversion = Math.random() < 0.5 ? pick(entrees) : null;
  const gate1 = pick(["ET", "OU"]);
  const gate2 = pick(["ET", "OU"]);
  const structure = { inversion, gate1, gate2 };
  const equation = construireEquation(structure);
  const trameCorrecte = calculerTrameS(trames, structure);

  const autre = (t) => (t === "ET" ? "OU" : "ET");
  const autresEntrees = entrees.filter((e) => e !== inversion);

  const variantes = new Map(); // cle -> trame, pour dédupliquer sans perdre la trame
  function ajouter(trame) {
    const cle = trameVersCle(trame);
    if (cle !== trameVersCle(trameCorrecte)) variantes.set(cle, trame);
  }

  // 1) porte 1 inversée (ET <-> OU sur la première combinaison).
  ajouter(calculerTrameS(trames, { ...structure, gate1: autre(gate1) }));
  // 2) porte 2 inversée.
  ajouter(calculerTrameS(trames, { ...structure, gate2: autre(gate2) }));
  // 3) négation oubliée, ou déplacée sur une autre entrée.
  if (inversion) {
    ajouter(calculerTrameS(trames, { ...structure, inversion: null }));
  }
  ajouter(calculerTrameS(trames, { ...structure, inversion: pick(autresEntrees) }));
  // 4) chronogramme correct mais lu avec un décalage temporel d'une division.
  ajouter(decaler(trameCorrecte));

  const distracteurs = melanger([...variantes.values()]).slice(0, 3);
  if (distracteurs.length < 3) {
    // Cas très rare où les entrées tirées ne laissent pas assez de trames
    // distinctes (ex. toutes les portes donnent le même résultat).
    return genererChronogrammeLogique();
  }

  const optionCorrecte = trameVersCle(trameCorrecte);
  const options = melanger([optionCorrecte, ...distracteurs.map(trameVersCle)]);

  return {
    presentation: {
      kind: "chronogramme-logique",
      equation,
      entrees,
      trames,
    },
    questions: [
      {
        label: "Quel chronogramme correspond à la sortie S ?",
        rendu: "chronogramme",
        options,
        correcte: optionCorrecte,
      },
    ],
  };
}
