// Génération d'exercice de remédiation : identifier les entrées et les
// sorties d'un système automatisé à partir d'un cahier des charges (C1-1,
// BTS CRSA). Un petit système est tiré au hasard, décrit par un texte, et
// l'élève doit dire pour 3 de ses éléments s'il s'agit d'une entrée ou
// d'une sortie. Module "plain JS" (pas de React).

const SYSTEMES = [
  {
    enonce:
      "Une barrière de parking automatique s'ouvre quand un badge est présenté au lecteur. Un capteur au sol détecte la présence d'un véhicule pour empêcher la fermeture. Le moteur fait lever la barrière, un voyant rouge s'allume quand le passage est interdit, et une sonnerie retentit pendant la manœuvre. Un bouton d'arrêt d'urgence permet de stopper le mouvement à tout moment.",
    elements: [
      { nom: "le lecteur de badge", type: "Entrée" },
      { nom: "le bouton d'arrêt d'urgence", type: "Entrée" },
      { nom: "le capteur de présence au sol", type: "Entrée" },
      { nom: "le moteur de levée de la barrière", type: "Sortie" },
      { nom: "le voyant rouge d'interdiction de passage", type: "Sortie" },
      { nom: "la sonnerie d'alerte", type: "Sortie" },
    ],
  },
  {
    enonce:
      "Un portail coulissant s'ouvre sur appui du bouton poussoir ou via la télécommande. Un capteur de fin de course détecte que le portail est totalement ouvert pour arrêter le moteur. Un voyant signale que le portail est ouvert, et un avertisseur sonore retentit pendant tout le mouvement.",
    elements: [
      { nom: "le bouton poussoir d'ouverture", type: "Entrée" },
      { nom: "la télécommande", type: "Entrée" },
      { nom: "le capteur de fin de course", type: "Entrée" },
      { nom: "le moteur du portail", type: "Sortie" },
      { nom: "le voyant de portail ouvert", type: "Sortie" },
      { nom: "l'avertisseur sonore de mouvement", type: "Sortie" },
    ],
  },
  {
    enonce:
      "Un tapis de tri détecte l'arrivée d'un colis grâce à un détecteur optique. Un capteur de bourrage surveille les blocages. Le moteur entraîne le tapis, un vérin dévie les colis vers la bonne sortie, et un voyant de défaut s'allume en cas de problème. Un bouton de réarmement permet de relancer le tapis après un arrêt.",
    elements: [
      { nom: "le détecteur de colis", type: "Entrée" },
      { nom: "le capteur de bourrage", type: "Entrée" },
      { nom: "le bouton de réarmement", type: "Entrée" },
      { nom: "le moteur du tapis", type: "Sortie" },
      { nom: "le vérin d'aiguillage", type: "Sortie" },
      { nom: "le voyant de défaut", type: "Sortie" },
    ],
  },
  {
    enonce:
      "Un store banne se rétracte automatiquement si l'anémomètre détecte un vent trop fort, ou si le capteur de pluie détecte des précipitations. Un bouton permet aussi une commande manuelle. Le moteur enroule ou déroule la toile, et un voyant indique que le store est déployé.",
    elements: [
      { nom: "l'anémomètre (capteur de vent)", type: "Entrée" },
      { nom: "le capteur de pluie", type: "Entrée" },
      { nom: "le bouton de commande manuelle", type: "Entrée" },
      { nom: "le moteur d'enroulement du store", type: "Sortie" },
      { nom: "le voyant de store déployé", type: "Sortie" },
    ],
  },
  {
    enonce:
      "Un réservoir est rempli automatiquement : quand le capteur de niveau bas détecte un manque d'eau, la pompe et l'électrovanne se mettent en route. Quand le capteur de niveau haut détecte que le réservoir est plein, le remplissage s'arrête et un voyant s'allume. Un bouton permet aussi de démarrer le remplissage manuellement.",
    elements: [
      { nom: "le capteur de niveau bas", type: "Entrée" },
      { nom: "le capteur de niveau haut", type: "Entrée" },
      { nom: "le bouton de démarrage manuel", type: "Entrée" },
      { nom: "la pompe de remplissage", type: "Sortie" },
      { nom: "l'électrovanne de remplissage", type: "Sortie" },
      { nom: "le voyant de réservoir plein", type: "Sortie" },
    ],
  },
  {
    enonce:
      "Sur une chaîne d'embouteillage, un capteur détecte la présence d'une bouteille sous la buse de remplissage. Un détecteur de niveau arrête le remplissage quand la bouteille est pleine. Un vérin referme ensuite le bouchon. Un voyant vert indique que la ligne est en marche, et un bouton d'arrêt d'urgence permet de tout stopper.",
    elements: [
      { nom: "le capteur de présence de bouteille", type: "Entrée" },
      { nom: "le détecteur de niveau de remplissage", type: "Entrée" },
      { nom: "le bouton d'arrêt d'urgence", type: "Entrée" },
      { nom: "le vérin de bouchage", type: "Sortie" },
      { nom: "la buse de remplissage", type: "Sortie" },
      { nom: "le voyant de ligne en marche", type: "Sortie" },
    ],
  },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Tire 3 éléments distincts (sans remise) parmi ceux du système choisi.
function pickTrois(elements) {
  const copie = [...elements];
  const choisis = [];
  for (let i = 0; i < 3 && copie.length > 0; i++) {
    const idx = Math.floor(Math.random() * copie.length);
    choisis.push(copie[idx]);
    copie.splice(idx, 1);
  }
  return choisis;
}

export function genererEntreesSorties() {
  const systeme = pick(SYSTEMES);
  const elementsChoisis = pickTrois(systeme.elements);

  return {
    presentation: {
      kind: "texte",
      enonce: systeme.enonce,
    },
    questions: elementsChoisis.map((el) => ({
      label: `${el.nom.charAt(0).toUpperCase()}${el.nom.slice(1)} : s'agit-il d'une entrée ou d'une sortie du système ?`,
      options: ["Entrée", "Sortie"],
      correcte: el.type,
    })),
  };
}
