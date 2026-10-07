// Dessins (descripteurs SVG) pour les exercices sur le filtre passe-bas :
// courbe de Bode (C2-7) et schéma du filtre RC (C2-6). Module "plain JS" :
// il renvoie des listes d'éléments simples { t: "line" | "text" | "path" |
// "rect" | "circle", ... } que RemediationScreen transforme en SVG. Ça évite
// de dupliquer la logique de dessin et permet de la tester hors React.

const COULEUR = {
  fin: "#E4E1D9",
  moyen: "#C9C5BB",
  gras: "#8A8680",
  texte: "#1C1B1A",
  courbe: "#33506B",
  trait: "#1C1B1A",
};

// ---------------------------------------------------------------------------
// Courbe de Bode d'un filtre passe-bas du 1er ordre, échelle de fréquence
// logarithmique de 10 Hz à 100 kHz. Gain en dB : G(f) = palier - 10 log(1+(f/fc)²)
// ---------------------------------------------------------------------------

export function gainBode(f, palier, fc) {
  return palier - 10 * Math.log10(1 + (f / fc) ** 2);
}

const BODE = { W: 476, MG: 40, MD: 32, MH: 12, MB: 26, PX_PAR_DB: 6, DECADES: 4 };

export function elementsBode(palier, fc) {
  const yMax = Math.ceil((palier + 5) / 10) * 10;
  const yMin = -30;
  const { W, MG, MD, MH, MB, PX_PAR_DB, DECADES } = BODE;
  const largeurTrace = W - MG - MD;
  const hauteurTrace = (yMax - yMin) * PX_PAR_DB;
  const H = MH + hauteurTrace + MB;

  const x = (f) => MG + (Math.log10(f) - 1) * (largeurTrace / DECADES); // 10 Hz = 10^1
  const y = (g) => MH + (yMax - g) * PX_PAR_DB;

  const items = [];
  // quadrillage vertical : 2..9 de chaque décade, puis les décades
  for (let d = 1; d < 5; d++) {
    for (let k = 2; k <= 9; k++) {
      const f = k * 10 ** d;
      if (f > 1e5) continue;
      items.push({ t: "line", x1: x(f), y1: y(yMax), x2: x(f), y2: y(yMin), stroke: COULEUR.fin, sw: 0.7 });
    }
  }
  // quadrillage horizontal : 1 dB, 5 dB, 10 dB
  for (let g = yMin; g <= yMax; g++) {
    const dix = g % 10 === 0;
    const cinq = g % 5 === 0;
    items.push({
      t: "line", x1: x(10), y1: y(g), x2: x(1e5), y2: y(g),
      stroke: dix ? COULEUR.gras : cinq ? COULEUR.moyen : COULEUR.fin, sw: dix ? 1.1 : cinq ? 0.9 : 0.5,
    });
  }
  for (let d = 1; d <= 5; d++) {
    const f = 10 ** d;
    items.push({ t: "line", x1: x(f), y1: y(yMax), x2: x(f), y2: y(yMin), stroke: COULEUR.gras, sw: 1.1 });
    items.push({
      t: "text", x: x(f), y: H - 8, s: String(f), anchor: "middle", size: 10, fill: COULEUR.texte,
    });
  }
  items.push({ t: "text", x: W - 2, y: H - 8, s: "Hz", anchor: "end", size: 10, fill: COULEUR.texte, bold: true });
  for (let g = yMin; g <= yMax; g += 10) {
    items.push({ t: "text", x: MG - 5, y: y(g) + 3.5, s: String(g), anchor: "end", size: 10, fill: COULEUR.texte });
  }
  items.push({ t: "text", x: 4, y: 9, s: "dB", anchor: "start", size: 10, fill: COULEUR.texte, bold: true });

  // courbe (arrêtée exactement au bord bas du cadre si elle le traverse)
  let d = "";
  const N = 240;
  const fSortie = fc * Math.sqrt(10 ** ((palier - yMin) / 10) - 1); // G(f) = yMin
  for (let i = 0; i <= N; i++) {
    const f = 10 ** (1 + (i / N) * DECADES);
    if (f >= fSortie) {
      d += `${d ? "L" : "M"} ${x(fSortie).toFixed(1)} ${y(yMin).toFixed(1)} `;
      break;
    }
    d += `${d ? "L" : "M"} ${x(f).toFixed(1)} ${y(gainBode(f, palier, fc)).toFixed(1)} `;
  }
  items.push({ t: "path", d, stroke: COULEUR.courbe, sw: 2, fill: "none" });
  items.push({ t: "rect", x: x(10), y: y(yMax), w: largeurTrace, h: hauteurTrace, stroke: COULEUR.trait, sw: 1.4, fill: "none" });

  return { W, H, items };
}

// ---------------------------------------------------------------------------
// Schéma d'un filtre RC passe-bas : R en série, C vers la masse.
// ---------------------------------------------------------------------------

export function elementsFiltreRC(texteR, texteC) {
  const W = 350;
  const H = 150;
  const t = { stroke: COULEUR.trait, sw: 1.6 };
  const items = [];
  const L = (x1, y1, x2, y2) => items.push({ t: "line", x1, y1, x2, y2, ...t });
  // fil du haut
  L(30, 40, 70, 40);
  items.push({ t: "rect", x: 70, y: 30, w: 70, h: 20, stroke: COULEUR.trait, sw: 1.6, fill: "#fff" });
  L(140, 40, 290, 40);
  // fil du bas
  L(30, 120, 290, 120);
  // condensateur (vertical) sur le noeud x = 200
  L(200, 40, 200, 72);
  L(184, 72, 216, 72);
  L(184, 84, 216, 84);
  L(200, 84, 200, 120);
  items.push({ t: "circle", cx: 200, cy: 40, r: 3, fill: COULEUR.trait });
  // bornes Ve / Vs
  items.push({ t: "circle", cx: 30, cy: 40, r: 3.5, fill: "#fff", stroke: COULEUR.trait, sw: 1.4 });
  items.push({ t: "circle", cx: 30, cy: 120, r: 3.5, fill: "#fff", stroke: COULEUR.trait, sw: 1.4 });
  items.push({ t: "circle", cx: 290, cy: 40, r: 3.5, fill: "#fff", stroke: COULEUR.trait, sw: 1.4 });
  items.push({ t: "circle", cx: 290, cy: 120, r: 3.5, fill: "#fff", stroke: COULEUR.trait, sw: 1.4 });
  items.push({ t: "line", x1: 30, y1: 46, x2: 30, y2: 114, stroke: COULEUR.courbe, sw: 1.4 });
  items.push({ t: "line", x1: 290, y1: 46, x2: 290, y2: 114, stroke: COULEUR.courbe, sw: 1.4 });
  items.push({ t: "text", x: 20, y: 84, s: "Ve", anchor: "end", size: 13, fill: COULEUR.courbe, bold: true });
  items.push({ t: "text", x: 300, y: 84, s: "Vs", anchor: "start", size: 13, fill: COULEUR.courbe, bold: true });
  items.push({ t: "text", x: 105, y: 24, s: "R", anchor: "middle", size: 13, fill: COULEUR.texte, bold: true });
  items.push({ t: "text", x: 226, y: 82, s: "C", anchor: "start", size: 13, fill: COULEUR.texte, bold: true });
  items.push({ t: "text", x: 105, y: 68, s: texteR, anchor: "middle", size: 12, fill: COULEUR.texte });
  items.push({ t: "text", x: 226, y: 98, s: texteC, anchor: "start", size: 12, fill: COULEUR.texte });
  return { W, H, items };
}
