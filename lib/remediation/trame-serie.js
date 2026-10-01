// Génération d'exercice de remédiation : décodage d'une trame RS232 (C5-3).
// Format repris de l'évaluation : start, D0..D7 (LSB en premier à la
// transmission), parité paire, stop. Lettre tirée parmi a-z (table annexe).
// Module "plain JS" (pas de React) : importable aussi bien depuis un
// composant serveur (pour savoir qu'un exercice existe) que client (pour le
// faire tourner).

const LETTRES = "abcdefghijklmnopqrstuvwxyz".split("");

function bin8(n) {
  return n.toString(2).padStart(8, "0");
}
function hex2(n) {
  return "0x" + n.toString(16).toUpperCase().padStart(2, "0");
}
function popcount(n) {
  let c = 0;
  while (n) {
    c += n & 1;
    n >>= 1;
  }
  return c;
}
function melanger(arr) {
  const copie = [...arr];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

export function genererTrameSerie() {
  const lettre = LETTRES[Math.floor(Math.random() * LETTRES.length)];
  const octet = lettre.charCodeAt(0);
  const bitsMSBfirst = bin8(octet).split("").map(Number); // D7..D0
  const bitsLSBfirst = [...bitsMSBfirst].reverse(); // D0..D7 (ordre de transmission)
  const parite = popcount(octet) % 2;
  const trame = [0, ...bitsLSBfirst, parite, 1]; // start, D0..D7, parité, stop

  const octetBinaire = bin8(octet);
  const octetHex = hex2(octet);
  const binInverse = bitsLSBfirst.join(""); // erreur classique : oubli du réordonnancement LSB->MSB
  const binPlus1 = bin8((octet + 1) & 0xff);
  const binMoins1 = bin8((octet - 1) & 0xff);

  const hexPlus1 = hex2((octet + 1) & 0xff);
  const hexMoins1 = hex2((octet - 1) & 0xff);
  const hexInverse = hex2(parseInt(binInverse, 2));

  const autresLettres = melanger(LETTRES.filter((l) => l !== lettre)).slice(0, 3);

  return {
    trame,
    bonnesReponses: { octetBinaire, octetHex, lettre },
    optionsQ1: melanger([octetBinaire, binInverse, binPlus1, binMoins1]),
    optionsQ2: melanger([octetHex, hexPlus1, hexMoins1, hexInverse]),
    optionsQ3: melanger([lettre, ...autresLettres]),
  };
}
