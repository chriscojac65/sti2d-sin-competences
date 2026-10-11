// Génération d'exercice de remédiation : décrire un système séquentiel sous
// forme de grafcet (C1-11-0, BTS CRSA). On ne peut pas tracer un grafcet à
// main levée dans un QCM : comme pour le logigramme (C1-5), le schéma à
// contacts (C1-6) et le chronogramme (C1-7), l'élève LIT — il choisit, parmi
// 4 grafcets dessinés, celui qui décrit le fonctionnement énoncé.
//
// Question 1 : quel grafcet correspond au cahier des charges ? Les trois
// mauvaises propositions sont des erreurs classiques (voir FAUTES) : actions
// décalées d'une étape, réceptivités permutées, front oublié ou ajouté, ET
// pris pour un OU, NON oublié, étape d'attente oubliée, étape initiale mal
// placée, cycle qui ne reboucle pas.
// Question 2 : équation d'une sortie à partir des étapes où elle est
// commandée (OU des étapes concernées).
//
// Seules les notions de la séance 1 sont utilisées (pas de temporisation, de
// compteur ni de divergence). RemediationScreen.js dessine chaque option
// (question.rendu === "grafcet") avec elementsGrafcet().
// Une option est la chaîne JSON { steps, loop } (clé de comparaison).

const SYSTEMES = [
  {
    nom: "Portail coulissant",
    enonce:
      "Portail coulissant. Au repos, il est fermé. Un appui sur le bouton o l'ouvre : le moteur MO tourne jusqu'au capteur « portail ouvert » po. Le portail reste ouvert jusqu'à un appui sur le bouton f. Le moteur MF le referme alors, jusqu'au capteur « portail fermé » pf.",
    etapes: [[[], "o"], [["MO"], "po"], [[], "f"], [["MF"], "pf"]],
  },
  {
    nom: "Presse",
    enonce:
      "Presse d'emboutissage. Au repos, le vérin est rentré (capteur vr). Un appui sur le bouton dcy, capot fermé (capteur cf), fait sortir le vérin (sortie S) jusqu'au capteur vs. Il rentre ensuite (sortie R) jusqu'à vr. Un appui maintenu sur dcy ne doit déclencher qu'un seul cycle.",
    etapes: [[[], "↑dcy . cf"], [["S"], "vs"], [["R"], "vr"]],
  },
  {
    nom: "Monte-charge",
    enonce:
      "Monte-charge à deux niveaux. Au repos, la cabine est en bas (capteur nb). Un appui sur le bouton h la fait monter (moteur MM) jusqu'au capteur nh. Elle y reste jusqu'à un appui sur le bouton b, puis redescend (moteur MD) jusqu'à nb.",
    etapes: [[[], "h"], [["MM"], "nh"], [[], "b"], [["MD"], "nb"]],
  },
  {
    nom: "Poste d'éjection",
    enonce:
      "Poste d'éjection de colis. Dès qu'un colis est détecté en entrée (capteur d), le convoyeur CV l'amène jusqu'au capteur f. Le convoyeur s'arrête et le vérin E pousse le colis jusqu'au capteur ve. Le vérin rentre ensuite (sortie R) jusqu'au capteur vr.",
    etapes: [[[], "d"], [["CV"], "f"], [["E"], "ve"], [["R"], "vr"]],
  },
  {
    nom: "Pompe de relevage",
    enonce:
      "Pompe de relevage. Quand le niveau haut nh est atteint et que le bouton d'arrêt ar n'est pas appuyé, la pompe P démarre. Elle s'arrête dès que le niveau bas nb n'est plus détecté (nb passe de 1 à 0). Le voyant H2 s'allume alors jusqu'à un appui sur le bouton d'acquittement acq.",
    etapes: [[[], "nh . /ar"], [["P"], "↓nb"], [["H2"], "acq"]],
  },
  {
    nom: "Pince de transfert",
    enonce:
      "Pince de transfert. Au repos, la pince est ouverte (capteur po). Une pièce détectée (capteur p) fait fermer la pince (sortie F) jusqu'au capteur pfm. Le bras tourne (sortie T) jusqu'au capteur pd. La pince s'ouvre (sortie O) jusqu'à po.",
    etapes: [[[], "p"], [["F"], "pfm"], [["T"], "pd"], [["O"], "po"]],
  },
  {
    nom: "Poste de peinture",
    enonce:
      "Poste de peinture. Un appui sur le bouton m, sans appui sur le bouton d'arrêt ar, lance le pulvérisateur PV et allume le voyant H1. Dès que la pièce est détectée au capteur ps, ils s'arrêtent et le convoyeur CV évacue la pièce jusqu'au capteur se.",
    etapes: [[[], "m . /ar"], [["PV", "H1"], "ps"], [["CV"], "se"]],
  },
  {
    nom: "Laveuse de pièces",
    enonce:
      "Laveuse de pièces. Un appui sur le bouton m remplit la cuve (électrovanne EV) jusqu'au capteur de niveau n. Le brassage BR démarre ensuite et dure jusqu'à un appui sur le bouton ok. La vidange VD se fait jusqu'au capteur « cuve vide » v.",
    etapes: [[[], "m"], [["EV"], "n"], [["BR"], "ok"], [["VD"], "v"]],
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

function versGrafcet(etapes) {
  return {
    loop: true,
    steps: etapes.map(([actions, r], i) => ({ n: i, init: i === 0, actions: [...actions], r })),
  };
}

function cle(g) {
  return JSON.stringify(g);
}

function renumeroter(g) {
  return { ...g, steps: g.steps.map((s, i) => ({ ...s, n: i })) };
}

function copie(g) {
  return { loop: g.loop, steps: g.steps.map((s) => ({ ...s, actions: [...s.actions] })) };
}

// --- erreurs classiques : chaque fonction renvoie { g, faute } ou null
const FAUTES = [
  (g) => {
    const n = g.steps.length;
    const actions = g.steps.map((s) => s.actions);
    if (actions.slice(1).every((a) => a.length === 0)) return null;
    const c = copie(g);
    for (let i = 1; i < n; i++) c.steps[i].actions = i === 1 ? [...actions[n - 1]] : [...actions[i - 1]];
    return { g: c, faute: "les actions sont décalées d'une étape (action placée trop tôt ou trop tard)" };
  },
  (g) => {
    const n = g.steps.length;
    const i = Math.floor(Math.random() * (n - 1));
    if (g.steps[i].r === g.steps[i + 1].r) return null;
    const c = copie(g);
    c.steps[i].r = g.steps[i + 1].r;
    c.steps[i + 1].r = g.steps[i].r;
    return { g: c, faute: "deux réceptivités sont permutées (l'événement attendu n'est pas le bon)" };
  },
  (g) => {
    const c = copie(g);
    const iF = c.steps.findIndex((s) => /^[↑↓]/.test(s.r));
    if (iF >= 0) {
      c.steps[iF].r = c.steps[iF].r.replace(/^[↑↓]/, "");
      return { g: c, faute: "le front est oublié (la réceptivité est un niveau, pas un changement d'état)" };
    }
    const iV = c.steps.findIndex((s) => /^[a-z]+$/.test(s.r));
    if (iV < 0) return null;
    c.steps[iV].r = (Math.random() < 0.5 ? "↑" : "↓") + c.steps[iV].r;
    return { g: c, faute: "un front est ajouté alors que l'énoncé parle d'un niveau (capteur actionné)" };
  },
  (g) => {
    const c = copie(g);
    const i = c.steps.findIndex((s) => s.r.includes(" . "));
    if (i < 0) return null;
    c.steps[i].r = c.steps[i].r.replace(" . ", " + ");
    return { g: c, faute: "un ET est écrit comme un OU" };
  },
  (g) => {
    const c = copie(g);
    const i = c.steps.findIndex((s) => s.r.includes("/"));
    if (i < 0) return null;
    c.steps[i].r = c.steps[i].r.replace("/", "");
    return { g: c, faute: "le NON (/) est oublié" };
  },
  (g) => {
    const i = g.steps.findIndex((s, k) => k > 0 && s.actions.length === 0);
    if (i < 0) return null;
    const c = copie(g);
    c.steps.splice(i, 1);
    return { g: renumeroter(c), faute: "une étape d'attente (sans action) est oubliée" };
  },
  (g) => {
    const c = copie(g);
    c.steps[0].init = false;
    c.steps[1].init = true;
    return { g: c, faute: "l'étape initiale est mal placée" };
  },
  (g) => ({ g: { ...copie(g), loop: false }, faute: "le grafcet ne reboucle pas sur l'étape initiale" }),
];

function decrire(g) {
  const lignes = g.steps.map((s, i) => {
    const actions = s.actions.length ? s.actions.join(" + ") : "aucune action (attente)";
    return `étape ${i}${i === 0 ? " (initiale, repos)" : ""} : ${actions}, puis réceptivité « ${s.r} »`;
  });
  return `${lignes.join(" ; ")} ; retour à l'étape 0.`;
}

function equation(indices) {
  return indices.map((i) => `X${i}`).join(" + ");
}

export function genererDescriptionGrafcet() {
  const systeme = pick(SYSTEMES);
  const correct = versGrafcet(systeme.etapes);
  const n = correct.steps.length;

  // --- distracteurs : erreurs classiques, distinctes de la bonne réponse
  const vus = new Set([cle(correct)]);
  const distracteurs = [];
  for (const f of melanger(FAUTES)) {
    const res = f(correct);
    if (!res) continue;
    const k = cle(res.g);
    if (vus.has(k)) continue;
    vus.add(k);
    distracteurs.push(res);
    if (distracteurs.length === 3) break;
  }
  if (distracteurs.length < 3) return genererDescriptionGrafcet();

  const optionCorrecte = cle(correct);
  const options1 = melanger([optionCorrecte, ...distracteurs.map((d) => cle(d.g))]);
  const fautes = distracteurs.map((d) => d.faute);

  // --- Q2 : équation d'une sortie
  const sorties = [...new Set(correct.steps.flatMap((s) => s.actions))];
  const sortie = pick(sorties);
  const S = correct.steps.map((s, i) => (s.actions.includes(sortie) ? i : -1)).filter((i) => i >= 0);
  const autres = Array.from({ length: n - 1 }, (_, i) => i + 1).filter((i) => !S.includes(i));
  const bonne = equation(S);
  const candidats = new Set();
  if (S.length > 1) {
    candidats.add(S.map((i) => `X${i}`).join(" . "));
    candidats.add(equation(S.slice(1)));
    candidats.add(equation(S.slice(0, -1)));
  } else {
    for (const i of autres) candidats.add(`X${i}`);
    candidats.add(`X${S[0]} + X${autres[0] ?? 0}`);
  }
  if (autres.length) candidats.add(equation([...S, autres[0]].sort((a, b) => a - b)));
  candidats.add(`X0 + ${bonne}`);
  candidats.delete(bonne);
  const distracteurs2 = melanger([...candidats]).slice(0, 3);
  let compl = 0;
  while (distracteurs2.length < 3) {
    const extra = `X${(S[0] + 1 + compl) % n} + X${(S[0] + 2 + compl) % n}`;
    if (extra !== bonne && !distracteurs2.includes(extra)) distracteurs2.push(extra);
    compl++;
  }
  const options2 = melanger([bonne, ...distracteurs2]);

  return {
    presentation: {
      kind: "texte",
      enonce: `${systeme.enonce}\nTu dois retrouver le grafcet de ce système (étape 0 = repos, au démarrage).`,
    },
    questions: [
      {
        label: "Quel grafcet décrit ce fonctionnement ?",
        rendu: "grafcet",
        options: options1,
        correcte: optionCorrecte,
        explication: `Le bon grafcet : ${decrire(correct)} Dans les autres propositions : ${fautes.join(" ; ")}.`,
      },
      {
        label: `Quelle est l'équation de la sortie ${sortie} dans ce grafcet ?`,
        options: options2,
        correcte: bonne,
        explication:
          S.length > 1
            ? `${sortie} est commandée dans les étapes ${S.join(" et ")} : elle est active si l'une OU l'autre de ces étapes est active, donc ${bonne} (un OU, pas un ET : deux étapes ne sont jamais actives en même temps dans une séquence).`
            : `${sortie} n'est commandée que dans l'étape ${S[0]} : elle est active exactement quand cette étape est active, donc ${bonne}.`,
      },
    ],
  };
}
