// Remédiation C5-1 (BTS CRSA) : arrêt d'urgence à contact NF et popup IHM.

const pick = (a) => a[Math.floor(Math.random() * a.length)];
function melanger(a) {
  const c = [...a];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

export function genererArretUrgence() {
  const machine = pick(["un convoyeur de palettes", "une presse", "un poste de palettisation", "un tapis d'alimentation"]);
  const entree = pick(["Ix_AU", "Ix_arret_urgence", "I_AU_COFFRET"]);

  const scenarios = [
    { cond: "l'arrêt d'urgence est au repos (non enfoncé, déverrouillé)", val: "1", expl: "Un contact NF est fermé au repos : il laisse passer le courant, donc l'entrée automate est à 1." },
    { cond: "on appuie sur l'arrêt d'urgence", val: "0", expl: "Le contact NF s'ouvre quand on appuie : plus de courant, l'entrée automate passe à 0." },
    { cond: "le fil entre le bouton d'arrêt d'urgence et l'automate est coupé (bouton au repos)", val: "0", expl: "Un fil coupé se comporte comme un contact ouvert : l'entrée est à 0, donc le système croit à un arrêt d'urgence et s'arrête. C'est voulu : c'est la sécurité positive." },
  ];
  const s = pick(scenarios);

  const bonne2 = `Quand ${entree} = 0 (arrêt d'urgence enfoncé)`;
  const opt2 = melanger([
    bonne2,
    `Quand ${entree} = 1 (arrêt d'urgence au repos)`,
    "Dès que l'automate change d'étape du grafcet",
    "Quand l'opérateur appuie sur le bouton Valider",
  ]);

  const bonne3 = `${entree} = 1 (arrêt d'urgence déverrouillé)`;
  const opt3 = melanger([
    bonne3,
    `${entree} = 0 (arrêt d'urgence enfoncé)`,
    "Toujours visible, dès l'ouverture de la fenêtre",
    "Seulement quand le grafcet est en étape initiale",
  ]);

  const bonne4 = "Si le fil est coupé ou le contact en panne, la machine s'arrête (sécurité positive)";
  const opt4 = melanger([
    bonne4,
    "Parce que ce contact coûte moins cher qu'un contact NO",
    "Parce que l'entrée automate à 1 consomme moins de courant",
    "Pour que la machine démarre automatiquement après l'arrêt",
  ]);

  return {
    presentation: {
      kind: "texte",
      enonce:
        `Sur ${machine}, le bouton d'arrêt d'urgence est un contact normalement fermé (NF) câblé sur l'entrée ${entree}.\n` +
        `Sur l'IHM, une fenêtre popup doit s'ouvrir lors d'un arrêt d'urgence. Elle bloque toute autre action. Le bouton Valider, qui la ferme, n'apparaît qu'après le déverrouillage de l'arrêt d'urgence.`,
    },
    questions: [
      {
        label: `Quelle est la valeur de l'entrée ${entree} quand ${s.cond} ?`,
        options: ["0", "1"],
        correcte: s.val,
        explication: s.expl,
      },
      {
        label: "Dans quelle condition la popup doit-elle s'ouvrir ?",
        options: opt2,
        correcte: bonne2,
        explication: `Le contact est NF : l'appui sur l'arrêt d'urgence le fait passer à 0. On déclenche donc l'action « ouvrir la popup » quand ${entree} = 0.`,
      },
      {
        label: "Dans quelle condition le bouton Valider doit-il apparaître ?",
        options: opt3,
        correcte: bonne3,
        explication: `Tant que l'arrêt d'urgence est enfoncé (${entree} = 0), l'opérateur ne doit pas pouvoir fermer la fenêtre. Après déverrouillage, le contact NF se referme et ${entree} repasse à 1 : Valider apparaît.`,
      },
      {
        label: "Pourquoi utilise-t-on un contact NF pour un arrêt d'urgence ?",
        options: opt4,
        correcte: bonne4,
        explication: "Avec un contact NF, une coupure de fil ou une panne donne le même état qu'un appui (entrée à 0) : le système passe en sécurité. Avec un contact NO, la panne resterait invisible et l'arrêt d'urgence ne fonctionnerait plus.",
      },
    ],
  };
}
