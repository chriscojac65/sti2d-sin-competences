// Source unique de vérité pour les exercices de remédiation disponibles.
//
// IMPORTANT : les codes de sous-compétence (ex. "C5-3", "C1-1") ne sont
// uniques qu'À L'INTÉRIEUR d'un référentiel. STI2D SIN et BTS CRSA ont par
// exemple chacun un "C5-3" qui ne désigne pas du tout la même compétence
// (décoder une trame série, contre comprendre le câblage d'un relais de
// sécurité). Tout ici est donc organisé par référentiel (son nom exact, tel
// qu'en base dans la table `referentiels`) puis par code, pour ne jamais
// rattacher l'exercice d'un référentiel à la compétence d'un autre.
//
// Pour ajouter une compétence avec son propre exercice : écrire son
// générateur — il doit renvoyer { presentation: {...}, questions: [...] }
// (voir trame-serie.js, lois-electrocinetique.js ou entrees-sorties.js) —
// puis ajouter UNE ligne dans GENERATEURS, sous le bon référentiel.
//
// Pour rattacher une compétence à un exercice déjà existant DU MÊME
// référentiel parce que le même exercice démontre plusieurs compétences à la
// fois (ex. décoder une trame prouve à la fois "lister les bits" et "décoder
// l'octet"), ajouter une ligne dans COMPETENCES_LIEES, sous ce référentiel :
// { "<code principal>": ["<code lié>", ...] }. Une réussite sur l'exercice
// du code principal valide alors aussi les codes liés.
//
// C'est le seul fichier à modifier : l'écran élève (bouton "S'entraîner",
// priorité du message) et la page d'exercice s'appuient tous les deux
// dessus, donc rien ne peut se désynchroniser.

import { genererTrameSerie } from "./trame-serie";
import { genererLoisElectrocinetique } from "./lois-electrocinetique";
import { genererEntreesSorties } from "./entrees-sorties";
import { genererEquationsBooleennes } from "./equations-booleennes";
import { genererLogigramme } from "./logigramme";
import { genererSchemaContacts } from "./schema-contacts";
import { genererChronogrammeLogique } from "./chronogramme-logique";
import { genererCalculFc } from "./calcul-fc";
import { genererLectureBode } from "./lecture-bode";

export const GENERATEURS = {
  "STI2D SIN": {
    "C5-3": genererTrameSerie,
    "C2-0": genererLoisElectrocinetique,
    "C2-6": genererCalculFc,
    "C2-7": genererLectureBode,
  },
  "BTS CRSA": {
    "C1-1": genererEntreesSorties,
    "C1-2": genererEquationsBooleennes,
    "C1-5": genererLogigramme,
    "C1-6": genererSchemaContacts,
    "C1-7": genererChronogrammeLogique,
  },
};

export const COMPETENCES_LIEES = {
  "STI2D SIN": {
    "C5-3": ["C5-2"],
  },
};

// referentiel -> code de sous-compétence -> code "principal" dont l'exercice
// la valide (lui-même s'il a un générateur direct, sinon le code dont il dépend).
export const CODE_EXERCICE_PRINCIPAL = {};
// referentiel -> Set des codes pour lesquels un exercice est disponible.
export const REMEDIATION_DISPONIBLE = {};

for (const referentiel of Object.keys(GENERATEURS)) {
  CODE_EXERCICE_PRINCIPAL[referentiel] = {};
  for (const code of Object.keys(GENERATEURS[referentiel])) {
    CODE_EXERCICE_PRINCIPAL[referentiel][code] = code;
  }
  const lies = COMPETENCES_LIEES[referentiel] || {};
  for (const [principal, codesLies] of Object.entries(lies)) {
    for (const code of codesLies) CODE_EXERCICE_PRINCIPAL[referentiel][code] = principal;
  }
  REMEDIATION_DISPONIBLE[referentiel] = new Set(Object.keys(CODE_EXERCICE_PRINCIPAL[referentiel]));
}
