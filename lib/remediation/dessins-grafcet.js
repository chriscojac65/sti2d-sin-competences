// Dessin (descripteurs SVG) d'un grafcet pour les exercices de remédiation
// C2-1 (lire un grafcet) et C1-11-0 (décrire un système séquentiel), BTS CRSA.
// Même principe que dessins-filtre.js : on renvoie une liste d'éléments
// simples { t: "line" | "text" | "path" | "rect" | "circle", ... } que
// RemediationScreen transforme en SVG (composant DessinSVG), ce qui permet
// de tester le dessin hors React.
//
// Entrée : steps = [{ n, init, actions: ["MO", ...], r: "po" | null }]
//   - n        : numéro de l'étape (affiché dans le carré)
//   - init     : true pour l'étape initiale (double carré)
//   - actions  : rectangles côte à côte à droite de l'étape
//   - r        : réceptivité de la transition qui SUIT l'étape
// Options : loop (retour vers la première étape), jeton (index de l'étape
// active, un point noir), surligne ({ type, idx } : élément entouré en
// orange pour demander son nom), compact (dessin plus serré pour les options).

const COULEUR = {
  trait: "#1C1B1A",
  surligne: "#FBEEE1",
  surligneTrait: "#C55A11",
};

const TAILLE = 28; // côté d'un carré d'étape
const CAR = 7.4; // largeur approximative d'un caractère à 12 px

function larg(s, k = CAR) {
  return s.length * k;
}

export function elementsGrafcet(steps, { loop = true, jeton = null, surligne = null, compact = false } = {}) {
  const DY = compact ? 56 : 66;
  const X0 = 64;
  const HAUT = 30;
  const n = steps.length;
  const yc = (i) => HAUT + TAILLE / 2 + i * DY;
  const yt = (i) => yc(i) + DY / 2;

  // --- 1re passe : géométrie des actions et des réceptivités
  const geo = steps.map((s, i) => {
    const boites = [];
    let xa = X0 + TAILLE / 2 + 16;
    for (const a of s.actions || []) {
      const w = Math.max(26, larg(a, 7) + 14);
      boites.push({ x: xa, w, a });
      xa += w;
    }
    const rw = s.r ? larg(s.r) + 6 : 0;
    return { boites, finActions: xa, rw };
  });
  const maxX = Math.max(
    X0 + 80,
    ...geo.map((g, i) => Math.max(g.finActions, X0 + 16 + g.rw))
  );
  const W = Math.ceil(maxX + 14);
  const H = Math.ceil(yt(n - 1) + (loop ? 34 : 18));
  const items = [];

  // --- surbrillance (dessinée en premier : elle reste sous le trait)
  if (surligne) {
    const { type, idx } = surligne;
    const pad = 5;
    let r = null;
    if (type === "init" || type === "step")
      r = { x: X0 - TAILLE / 2 - pad, y: yc(idx) - TAILLE / 2 - pad, w: TAILLE + 2 * pad, h: TAILLE + 2 * pad };
    else if (type === "trans")
      r = { x: X0 - 17, y: yt(idx) - 9, w: 34, h: 18 };
    else if (type === "recept")
      r = { x: X0 + 12, y: yt(idx) - 11, w: geo[idx].rw + 8, h: 22 };
    else if (type === "action" && geo[idx].boites.length) {
      const b = geo[idx].boites;
      r = { x: b[0].x - pad, y: yc(idx) - 11 - pad, w: geo[idx].finActions - b[0].x + 2 * pad, h: 22 + 2 * pad };
    }
    if (r)
      items.push({ t: "rect", x: r.x, y: r.y, w: r.w, h: r.h, stroke: COULEUR.surligneTrait, sw: 1.6, fill: COULEUR.surligne });
  }

  // --- étapes, actions, transitions
  steps.forEach((s, i) => {
    const y = yc(i);
    items.push({ t: "rect", x: X0 - TAILLE / 2, y: y - TAILLE / 2, w: TAILLE, h: TAILLE, stroke: COULEUR.trait, sw: 1.7, fill: "#FFFFFF" });
    if (s.init)
      items.push({ t: "rect", x: X0 - TAILLE / 2 + 3.5, y: y - TAILLE / 2 + 3.5, w: TAILLE - 7, h: TAILLE - 7, stroke: COULEUR.trait, sw: 1.3, fill: "none" });
    const actif = jeton === i;
    items.push({ t: "text", x: X0, y: y + (actif ? 0 : 4.5), s: String(s.n), anchor: "middle", size: 13, fill: COULEUR.trait, bold: true });
    if (actif) items.push({ t: "circle", cx: X0, cy: y + 8, r: 3.2, fill: COULEUR.trait });

    if (geo[i].boites.length) {
      items.push({ t: "line", x1: X0 + TAILLE / 2, y1: y, x2: X0 + TAILLE / 2 + 16, y2: y, stroke: COULEUR.trait, sw: 1.5 });
      for (const b of geo[i].boites) {
        items.push({ t: "rect", x: b.x, y: y - 11, w: b.w, h: 22, stroke: COULEUR.trait, sw: 1.4, fill: "#FFFFFF" });
        items.push({ t: "text", x: b.x + b.w / 2, y: y + 4, s: b.a, anchor: "middle", size: 11.5, fill: COULEUR.trait });
      }
    }

    // liaison vers la transition, la transition, puis la liaison vers l'étape suivante
    items.push({ t: "line", x1: X0, y1: y + TAILLE / 2, x2: X0, y2: yt(i), stroke: COULEUR.trait, sw: 1.5 });
    items.push({ t: "line", x1: X0 - 9, y1: yt(i), x2: X0 + 9, y2: yt(i), stroke: COULEUR.trait, sw: 3.4 });
    if (s.r) items.push({ t: "text", x: X0 + 16, y: yt(i) + 4, s: s.r, anchor: "start", size: 12, fill: COULEUR.trait });
    if (i < n - 1)
      items.push({ t: "line", x1: X0, y1: yt(i), x2: X0, y2: yc(i + 1) - TAILLE / 2, stroke: COULEUR.trait, sw: 1.5 });
  });

  // --- retour vers l'étape initiale (liaison orientée vers le haut du schéma)
  if (loop) {
    const yb = yt(n - 1) + 22;
    const xl = X0 - 40;
    const yh = yc(0) - TAILLE / 2 - 16;
    items.push({ t: "line", x1: X0, y1: yt(n - 1), x2: X0, y2: yb, stroke: COULEUR.trait, sw: 1.5 });
    items.push({ t: "line", x1: X0, y1: yb, x2: xl, y2: yb, stroke: COULEUR.trait, sw: 1.5 });
    items.push({ t: "line", x1: xl, y1: yb, x2: xl, y2: yh, stroke: COULEUR.trait, sw: 1.5 });
    items.push({ t: "line", x1: xl, y1: yh, x2: X0, y2: yh, stroke: COULEUR.trait, sw: 1.5 });
    items.push({ t: "line", x1: X0, y1: yh, x2: X0, y2: yc(0) - TAILLE / 2, stroke: COULEUR.trait, sw: 1.5 });
    const yp = yc(0) - TAILLE / 2;
    items.push({ t: "path", d: `M ${X0} ${yp} L ${X0 - 4.5} ${yp - 9} L ${X0 + 4.5} ${yp - 9} Z`, stroke: COULEUR.trait, sw: 1, fill: COULEUR.trait });
  }

  return { W, H, items };
}
