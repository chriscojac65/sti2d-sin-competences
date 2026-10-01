// Source unique de vérité pour les exercices de remédiation disponibles.
// Pour ajouter une compétence : écrire son générateur (voir trame-serie.js
// pour l'exemple), puis ajouter UNE ligne ci-dessous. C'est le seul endroit
// à modifier : l'écran élève (bouton "S'entraîner", priorité du message) et
// la page d'exercice s'appuient tous les deux sur ce registre, donc rien ne
// peut se désynchroniser.

import { genererTrameSerie } from "./trame-serie";

export const GENERATEURS = {
  "C5-3": genererTrameSerie,
};

export const REMEDIATION_DISPONIBLE = new Set(Object.keys(GENERATEURS));
