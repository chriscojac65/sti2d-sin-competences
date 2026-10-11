// Remédiation C1-12 (BTS CRSA) : compter des pièces avec un compteur (CTU)
// sur front descendant d'un capteur (TP IHM : Ix_remove_item).
// Présentation : réutilise "chronogramme-logique" (un signal I) avec un
// intitulé personnalisé.

const LONGUEUR = 12;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function melanger(a) {
  const c = [...a];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

function compter(t) {
  let montants = 0, descendants = 0;
  for (let i = 1; i < t.length; i++) {
    if (t[i - 1] === 0 && t[i] === 1) montants++;
    if (t[i - 1] === 1 && t[i] === 0) descendants++;
  }
  return { montants, descendants, niveaux: t.filter((b) => b === 1).length };
}

function trameAleatoire() {
  for (;;) {
    const t = Array.from({ length: LONGUEUR }, () => (Math.random() < 0.45 ? 1 : 0));
    const c = compter(t);
    const valeurs = new Set([c.montants, c.descendants, c.niveaux]);
    if (c.descendants >= 2 && c.descendants <= 4 && valeurs.size === 3) return t;
  }
}

export function genererComptagePalettes() {
  const trame = trameAleatoire();
  const { montants, descendants, niveaux } = compter(trame);
  const depart = pick([0, 0, 5, 10, 20]);
  const nomCapteur = pick(["Ix_remove_item", "Ix_sortie_palette", "Ix_fin_convoyeur"]);

  // Q1 : nombre de pièces comptées sur front descendant
  const cand1 = [...new Set([descendants, montants, niveaux, descendants + 1, Math.max(0, descendants - 1)])];
  const opt1 = melanger([descendants, ...melanger(cand1.filter((v) => v !== descendants)).slice(0, 3)]).map(String);

  // Q2 : valeur du compteur après le relevé
  const attendu = depart + descendants;
  const cand2 = [...new Set([attendu, depart + montants, depart + niveaux, attendu + 1, Math.max(0, attendu - 1)])];
  const opt2 = melanger([attendu, ...melanger(cand2.filter((v) => v !== attendu)).slice(0, 3)]).map(String);

  // Q3 : câblage correct
  const bonne = `Contact à front descendant (N) sur ${nomCapteur}, relié à l'entrée CU d'un compteur CTU`;
  const opt3 = melanger([
    bonne,
    `Contact à front montant (P) sur ${nomCapteur}, relié à l'entrée CU d'un compteur CTU`,
    `Contact NO simple sur ${nomCapteur}, relié à l'entrée CU d'un compteur CTU`,
    `Contact à front descendant (N) sur ${nomCapteur}, relié à l'entrée R (remise à zéro) d'un compteur CTU`,
  ]);

  return {
    presentation: {
      kind: "chronogramme-logique",
      intitule: `Le signal I est le capteur ${nomCapteur} (1 = palette devant le capteur). On compte une palette quand elle QUITTE le capteur. Relevé sur ${LONGUEUR} divisions :`,
      equation: `I = ${nomCapteur}  |  compteur initial = ${depart}`,
      entrees: ["I"],
      trames: { I: trame },
    },
    questions: [
      {
        label: "Combien de fronts descendants contient ce relevé ?",
        options: opt1,
        correcte: String(descendants),
        explication: `Un front descendant est un passage de 1 à 0. Ici il y en a ${descendants}. Il y a ${montants} fronts montants (0 vers 1) et le signal est à 1 pendant ${niveaux} divisions : ce sont deux autres grandeurs, à ne pas confondre avec le nombre de fronts descendants.`,
      },
      {
        label: `Le compteur vaut ${depart} au début du relevé et compte sur chaque front descendant. Quelle valeur affiche-t-il à la fin ?`,
        options: opt2,
        correcte: String(attendu),
        explication: `${depart} + ${descendants} front(s) descendant(s) = ${attendu}. Le compteur ajoute 1 à chaque front, pas à chaque division où le signal est à 1.`,
      },
      {
        label: "Quel montage compte une palette à chaque fois qu'elle quitte le capteur ?",
        options: opt3,
        correcte: bonne,
        explication: `Le front descendant détecte la fin de présence de la palette (1 vers 0) : une seule impulsion par palette, quelle que soit la durée de présence. Un contact simple ferait compter à chaque cycle automate tant que la palette est devant le capteur ; l'entrée R remet le compteur à zéro au lieu de compter.`,
      },
    ],
  };
}
