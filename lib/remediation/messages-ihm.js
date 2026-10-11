// Remédiation C2-3 (BTS CRSA) : messages opérateur conditionnés par %MW320,
// écrits par un bloc Move selon l'étape active (GEMMA : A1, A6, mode manuel).
// Les valeurs de %MW320 sont tirées au hasard et données dans l'énoncé.

function melanger(a) {
  const c = [...a];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

const ETAPES = [
  { nom: "Eini_GCH", message: "Appuyer sur Start pour démarrer la production ou passer en Mode Manuel", gemma: "A1 : arrêt dans l'état initial", expl: "Eini_GCH est l'étape initiale du grafcet de conduite : case A1 du GEMMA (arrêt dans l'état initial)." },
  { nom: "EA6_GCH", message: "Passer en Mode Init et appuyer sur INITIALISATION", gemma: "A6 : mise de la PO dans l'état initial", expl: "EA6_GCH correspond au rectangle A6 du GEMMA : on remet la partie opérative dans son état initial." },
  { nom: "E8_GCH", message: "Actionner les différentes sorties grâce aux boutons sur l'IHM", gemma: "F6 : marche de vérification dans le désordre (mode manuel)", expl: "E8_GCH est l'étape du mode manuel, où l'on vérifie les actionneurs un par un : c'est le rectangle F6 du GEMMA (marche de vérification dans le désordre)." },
];

export function genererMessagesIHM() {
  const valeurs = melanger([1, 2, 3, 4]).slice(0, 3);
  const table = ETAPES.map((e, i) => ({ ...e, val: valeurs[i] }));
  const lignes = table.map((t) => `• %MW320 = ${t.val} : « ${t.message} »`).join("\n");

  const enonce =
    "L'IHM affiche, dans le cadre gris en haut de l'écran, un message qui dépend de la valeur du mot %MW320. " +
    "Dans Unity Pro, une section Message_IHM contient un bloc Move qui écrit dans %MW320 selon l'étape active du grafcet de conduite.\n\n" +
    "Messages configurés dans l'IHM :\n" + lignes +
    "\n\nSi %MW320 contient une autre valeur, aucun message n'est affiché.";

  // Q1 : valeur à écrire selon l'étape
  const e1 = table[Math.floor(Math.random() * 3)];
  const options1 = [...new Set([e1.val, ...table.map((t) => t.val), 0])].map(String);
  const correct1 = String(e1.val);

  // Q2 : message affiché pour une valeur
  const autre = [1, 2, 3, 4, 5].filter((v) => !valeurs.includes(v));
  const aucun = Math.random() < 0.3;
  const v2 = aucun ? autre[Math.floor(Math.random() * autre.length)] : valeurs[Math.floor(Math.random() * 3)];
  const msg2 = aucun ? "Aucun message n'est affiché" : table.find((t) => t.val === v2).message;
  const options2 = melanger([...table.map((t) => t.message), "Aucun message n'est affiché"]);
  const expl2 = aucun
    ? `La valeur ${v2} n'est associée à aucun message dans l'IHM : le cadre reste vide.`
    : `Le message est choisi par la valeur de %MW320 : pour ${v2}, c'est celui configuré dans la liste ci-dessus.`;

  // Q3 : rectangle GEMMA
  const e3 = table[Math.floor(Math.random() * 3)];
  const options3 = melanger(ETAPES.map((e) => e.gemma).concat(["D1 : marche de production en défaut"]));

  return {
    presentation: { kind: "texte", enonce },
    questions: [
      {
        label: `Le grafcet est dans l'étape ${e1.nom}. Quelle valeur le bloc Move doit-il écrire dans %MW320 ?`,
        options: options1,
        correcte: correct1,
        explication: `Pour l'étape ${e1.nom}, le message à afficher est « ${e1.message} », associé à %MW320 = ${e1.val}. Le bloc Move, déclenché par ${e1.nom}, écrit donc ${e1.val} dans %MW320.`,
      },
      {
        label: `%MW320 contient ${v2}. Que voit l'opérateur dans le cadre gris ?`,
        options: options2,
        correcte: msg2,
        explication: expl2,
      },
      {
        label: `À quel rectangle du GEMMA correspond l'étape ${e3.nom} ?`,
        options: options3,
        correcte: e3.gemma,
        explication: e3.expl,
      },
    ],
  };
}
