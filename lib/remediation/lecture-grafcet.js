// Génération d'exercice de remédiation : lire un grafcet fourni (C2-1,
// BTS CRSA) — nommer un élément, dire si une transition est franchie, dire
// quelle étape est active ensuite. Trois QCM sur un même grafcet.
//
// Le grafcet est linéaire et bouclé (3 ou 4 étapes, étape 0 initiale), avec
// des réceptivités de cinq sortes : variable seule (a), ET (a . b), ET avec
// NON (a . /b), front montant (↑a) et front descendant (↓a). Seules les
// notions vues en séance 1 sont utilisées (pas de temporisation, de
// compteur ni de divergence).
//
// Pièges volontairement reproduits (ce sont ceux de l'évaluation) :
//   - une réceptivité vraie n'a d'effet que sur la transition située sous
//     l'étape ACTIVE (les autres sont ignorées) ;
//   - un front n'est vrai qu'à l'instant du changement : une entrée qui
//     vaut 1 "depuis avant" ne donne pas de front montant ;
//   - /b se lit « non b ».
// RemediationScreen.js dessine le grafcet (presentation.kind === "grafcet")
// avec elementsGrafcet() de dessins-grafcet.js.

const LETTRES = ["a", "b", "c", "d", "e", "m", "p", "s"];
const SORTIES = ["M1", "M2", "V1", "V2", "H1", "KM1", "KM2"];

const NOMS = {
  init: "étape initiale",
  step: "étape",
  trans: "transition",
  recept: "réceptivité",
  action: "action associée",
  lien: "liaison orientée",
};

const EXPLICATION_NOM = {
  init: "Le double carré repère l'étape initiale : c'est l'étape active au démarrage, au repos.",
  step: "Un carré numéroté est une étape. Elle est active ou inactive ; ses actions ne sont exécutées que lorsqu'elle est active.",
  trans: "La petite barre sur la liaison est une transition : elle indique la possibilité d'évoluer d'une étape à la suivante.",
  recept: "Le texte à droite de la barre est la réceptivité : la condition logique qui doit être vraie pour franchir la transition.",
  action: "Le rectangle à droite d'une étape est une action associée : elle est exécutée tant que l'étape est active.",
};

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

function texteRecept(r) {
  switch (r.kind) {
    case "var": return r.x;
    case "et": return `${r.x} . ${r.y}`;
    case "etnon": return `${r.x} . /${r.y}`;
    case "montant": return `↑${r.x}`;
    default: return `↓${r.x}`;
  }
}

function lettresDe(r) {
  return r.y ? [r.x, r.y] : [r.x];
}

// maintenant / avant : objets { lettre: 0|1 }
function evaluer(r, maintenant, avant) {
  const v = (l) => maintenant[l] === 1;
  const w = (l) => avant[l] === 1;
  switch (r.kind) {
    case "var": return v(r.x);
    case "et": return v(r.x) && v(r.y);
    case "etnon": return v(r.x) && !v(r.y);
    case "montant": return !w(r.x) && v(r.x);
    default: return w(r.x) && !v(r.x);
  }
}

function genererGrafcet() {
  const n = pick([3, 4]);
  const lettres = melanger(LETTRES);
  const primaires = lettres.slice(0, n);
  const secondaires = lettres.slice(n);
  let nbFronts = 0;
  const trans = primaires.map((x) => {
    let kind = pick(["var", "var", "var", "et", "etnon", "etnon", "montant", "descendant"]);
    if ((kind === "montant" || kind === "descendant") && nbFronts >= 2) kind = "var";
    if (kind === "montant" || kind === "descendant") nbFronts++;
    const r = { kind, x };
    if (kind === "et" || kind === "etnon") r.y = pick(secondaires);
    return r;
  });

  const sorties = melanger(SORTIES);
  let k = 0;
  const idxAttente = Math.random() < 0.3 ? 1 + Math.floor(Math.random() * (n - 1)) : -1;
  const steps = trans.map((r, i) => {
    let actions = [];
    if (i > 0 && i !== idxAttente) {
      actions = [sorties[k++]];
      if (Math.random() < 0.25) actions.push(sorties[k++]);
    }
    return { n: i, init: i === 0, actions, r: texteRecept(r) };
  });
  return { steps, trans };
}

// Construit une situation (entrées maintenant / juste avant) pour la
// transition située sous l'étape active k, avec le résultat voulu.
function genererSituation(trans, k, voulu) {
  const T = trans[k];
  const maintenant = {};
  const avant = {};
  const set = (obj, l, val) => { obj[l] = val; };
  const bit = () => (Math.random() < 0.5 ? 1 : 0);

  switch (T.kind) {
    case "var":
      set(maintenant, T.x, voulu ? 1 : 0);
      break;
    case "et":
      if (voulu) { set(maintenant, T.x, 1); set(maintenant, T.y, 1); }
      else { const c = pick([[0, 0], [1, 0], [0, 1]]); set(maintenant, T.x, c[0]); set(maintenant, T.y, c[1]); }
      break;
    case "etnon":
      if (voulu) { set(maintenant, T.x, 1); set(maintenant, T.y, 0); }
      else { const c = pick([[0, 0], [1, 1], [1, 1], [0, 1]]); set(maintenant, T.x, c[0]); set(maintenant, T.y, c[1]); }
      break;
    case "montant":
      if (voulu) { set(avant, T.x, 0); set(maintenant, T.x, 1); }
      else { const c = pick([[1, 1], [1, 1], [0, 0], [1, 0]]); set(avant, T.x, c[0]); set(maintenant, T.x, c[1]); }
      break;
    default: // descendant
      if (voulu) { set(avant, T.x, 1); set(maintenant, T.x, 0); }
      else { const c = pick([[0, 0], [1, 1], [1, 1], [0, 1]]); set(avant, T.x, c[0]); set(maintenant, T.x, c[1]); }
  }
  const propres = new Set(lettresDe(T));
  // les lettres de T qui n'ont pas de valeur "avant" imposée gardent la même qu'à présent
  for (const l of propres) if (avant[l] === undefined) avant[l] = maintenant[l];

  // piège : la réceptivité de la transition SUIVANTE est rendue vraie (sans effet)
  const suivante = trans[(k + 1) % trans.length];
  if (Math.random() < 0.5) {
    const libres = lettresDe(suivante).filter((l) => !propres.has(l));
    if (libres.length === lettresDe(suivante).length) {
      if (suivante.kind === "etnon") { maintenant[suivante.x] = 1; maintenant[suivante.y] = 0; }
      else for (const l of libres) maintenant[l] = 1;
      if (suivante.kind === "montant") { avant[suivante.x] = 0; maintenant[suivante.x] = 1; }
      if (suivante.kind === "descendant") { avant[suivante.x] = 1; maintenant[suivante.x] = 0; }
      for (const l of libres) if (avant[l] === undefined) avant[l] = maintenant[l];
    }
  }
  // quelques entrées à 1 supplémentaires, sans rapport avec T
  for (const l of LETTRES) {
    if (maintenant[l] === undefined && Math.random() < 0.25) {
      maintenant[l] = 1; avant[l] = 1;
    }
  }
  for (const l of Object.keys(maintenant)) if (avant[l] === undefined) avant[l] = maintenant[l];
  return { maintenant, avant };
}

function liste(obj) {
  const l = Object.keys(obj).filter((x) => obj[x] === 1).sort();
  return l.length ? l.join(", ") : "aucune";
}

function explicationFranchissement(T, k, maintenant, avant, franchie, nbEtapes) {
  const v = (l) => maintenant[l];
  const w = (l) => avant[l];
  let calcul;
  switch (T.kind) {
    case "var":
      calcul = `${T.x} vaut ${v(T.x)}, donc la réceptivité ${T.x} est ${franchie ? "vraie" : "fausse"}.`;
      break;
    case "et":
      calcul = `${T.x} = ${v(T.x)} et ${T.y} = ${v(T.y)} : ${T.x} . ${T.y} = ${franchie ? 1 : 0} (un ET demande les deux à 1).`;
      break;
    case "etnon":
      calcul = `${T.x} = ${v(T.x)} et ${T.y} = ${v(T.y)}, donc /${T.y} (non ${T.y}) = ${1 - v(T.y)} : ${T.x} . /${T.y} = ${franchie ? 1 : 0}.`;
      break;
    case "montant":
      calcul = franchie
        ? `${T.x} passe de 0 à 1 : c'est un front montant, ↑${T.x} est vraie à cet instant.`
        : w(T.x) === 1 && v(T.x) === 1
        ? `${T.x} vaut 1 mais valait déjà 1 juste avant : il n'y a pas de front montant, ↑${T.x} est fausse (un front n'est vrai qu'à l'instant du changement).`
        : w(T.x) === 1
        ? `${T.x} passe de 1 à 0 : c'est un front descendant, pas montant, donc ↑${T.x} est fausse.`
        : `${T.x} reste à 0 : aucun front, ↑${T.x} est fausse.`;
      break;
    default:
      calcul = franchie
        ? `${T.x} passe de 1 à 0 : c'est un front descendant, ↓${T.x} est vraie à cet instant.`
        : w(T.x) === 0 && v(T.x) === 1
        ? `${T.x} passe de 0 à 1 : c'est un front montant, pas descendant, donc ↓${T.x} est fausse.`
        : w(T.x) === 1 && v(T.x) === 1
        ? `${T.x} reste à 1 : aucun front descendant, ↓${T.x} est fausse.`
        : `${T.x} reste à 0 : aucun front, ↓${T.x} est fausse.`;
  }
  const fin = franchie
    ? `L'étape ${k} est active (la transition est validée) et sa réceptivité est vraie : la transition est franchie.`
    : `La réceptivité est fausse : la transition n'est pas franchie, l'étape ${k} reste active.`;
  return `${calcul} ${fin} Seule la transition située sous l'étape active compte : les autres réceptivités n'ont aucun effet.`;
}

export function genererLectureGrafcet() {
  const { steps, trans } = genererGrafcet();
  const n = steps.length;
  const k = Math.floor(Math.random() * n);
  const T = trans[k];
  const franchie = Math.random() < 0.5;
  const { maintenant, avant } = genererSituation(trans, k, franchie);
  // vérification de cohérence : le résultat voulu est bien celui du calcul
  if (evaluer(T, maintenant, avant) !== franchie) return genererLectureGrafcet();
  const suivant = franchie ? (k + 1) % n : k;
  const front = T.kind === "montant" || T.kind === "descendant";

  // --- Q1 : nom de l'élément surligné
  const types = ["init", "step", "trans", "recept"];
  if (steps.some((s) => s.actions.length)) types.push("action");
  const type = pick(types);
  let idx;
  if (type === "init") idx = 0;
  else if (type === "step") idx = 1 + Math.floor(Math.random() * (n - 1));
  else if (type === "action") idx = pick(steps.map((s, i) => (s.actions.length ? i : -1)).filter((i) => i >= 0));
  else idx = Math.floor(Math.random() * n);
  const bonNom = NOMS[type];
  const options1 = melanger([bonNom, ...melanger(Object.values(NOMS).filter((x) => x !== bonNom)).slice(0, 3)]);

  const lignes = [`Le jeton (●) repère l'étape active : l'étape ${k}.`, `Entrées à 1 maintenant : ${liste(maintenant)}.`];
  if (front) lignes.push(`Entrées à 1 juste avant : ${liste(avant)}.`);

  return {
    presentation: {
      kind: "grafcet",
      enonce: lignes.join("\n"),
      steps,
      jeton: k,
      surligne: { type, idx },
    },
    questions: [
      {
        label: "Quel est le nom de l'élément entouré en orange ?",
        options: options1,
        correcte: bonNom,
        explication: EXPLICATION_NOM[type],
      },
      {
        label: `La transition située sous l'étape ${k} (réceptivité « ${texteRecept(T)} ») est-elle franchie dans cette situation ?`,
        options: ["Oui", "Non"],
        correcte: franchie ? "Oui" : "Non",
        explication: explicationFranchissement(T, k, maintenant, avant, franchie, n),
      },
      {
        label: "Quelle étape est active juste après ?",
        options: Array.from({ length: n }, (_, i) => `Étape ${i}`),
        correcte: `Étape ${suivant}`,
        explication: franchie
          ? `La transition est franchie : l'étape ${k} est désactivée et l'étape ${suivant} est activée${suivant === 0 ? " (retour à l'étape initiale, le cycle recommence)" : ""}.`
          : `La transition n'est pas franchie : rien n'évolue, l'étape ${k} reste la seule étape active.`,
      },
    ],
  };
}
