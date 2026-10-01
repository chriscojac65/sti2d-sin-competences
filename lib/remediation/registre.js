// Source unique de vérité pour les exercices de remédiation disponibles.
//
// Pour ajouter une compétence avec son propre exercice : écrire son
// générateur — il doit renvoyer { presentation: {...}, questions: [...] }
// (voir trame-serie.js ou lois-electrocinetique.js) — puis ajouter UNE
// ligne dans GENERATEURS ci-dessous.
//
// Pour rattacher une compétence à un exercice déjà existant parce que le
// même exercice démontre plusieurs compétences à la fois (ex. décoder une
// trame prouve à la fois "lister les bits" et "décoder l'octet"), ajouter
// une ligne dans COMPETENCES_LIEES : { "<code principal>": ["<code lié>", ...] }.
// Une réussite sur l'exercice du code principal valide alors aussi les
// codes liés.
//
// C'est le seul fichier à modifier : l'écran élève (bouton "S'entraîner",
// priorité du message) et la page d'exercice s'appuient tous les deux
// dessus, donc rien ne peut se désynchroniser.

import { genererTrameSerie } from "./trame-serie";
import { genererLoisElectrocinetique } from "./lois-electrocinetique";

export const GENERATEURS = {
  "C5-3": genererTrameSerie,
  "C2-0": genererLoisElectrocinetique,
};

export const COMPETENCES_LIEES = {
  "C5-3": ["C5-2"],
};

// Code de sous-compétence -> code "principal" dont l'exercice la valide
// (lui-même s'il a un générateur direct, sinon le code dont il dépend).
export const CODE_EXERCICE_PRINCIPAL = {};
for (const code of Object.keys(GENERATEURS)) {
  CODE_EXERCICE_PRINCIPAL[code] = code;
}
for (const [principal, lies] of Object.entries(COMPETENCES_LIEES)) {
  for (const code of lies) CODE_EXERCICE_PRINCIPAL[code] = principal;
}

export const REMEDIATION_DISPONIBLE = new Set(Object.keys(CODE_EXERCICE_PRINCIPAL));
