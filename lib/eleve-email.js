export const DOMAINE_ELEVES = "eleves.sti2d-sin.fr";

export function emailDepuisIdentifiant(identifiant) {
  return `${identifiant.trim().toLowerCase()}@${DOMAINE_ELEVES}`;
}
