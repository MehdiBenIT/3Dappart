import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/*
 * Meubles : chaque meuble est un Group contenant des pièces 3D détaillées
 * (aux dimensions réelles) + une boîte de clic transparente + une étiquette.
 * x,z = CENTRE au sol ; rotation = degrés autour de Y.
 */

const _matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!_matCache.has(key)) {
    _matCache.set(key, new THREE.MeshStandardMaterial({
      color, roughness: opts.rough ?? 0.75, metalness: opts.metal ?? 0.05,
      transparent: opts.opacity != null, opacity: opts.opacity ?? 1,
    }));
  }
  return _matCache.get(key);
}

// Boîte aux coins arrondis, castShadow/receiveShadow activés.
// Matériau cloné pour que le surlignage (emissive) soit propre à chaque meuble.
function rb(w, h, d, color, opts = {}) {
  const r = Math.min(opts.radius ?? 0.03, w / 2.2, h / 2.2, d / 2.2);
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.max(r, 0.004)), mat(color, opts).clone());
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

// Teintes dérivées pour varier légèrement (coussins, plateaux…).
function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, f);
  return "#" + c.getHexString();
}

// Texture de tapis : anneaux concentriques (motif discret).
function rugTexture(col) {
  const s = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = shade(col, -0.14);
  ctx.lineWidth = 5;
  for (let r = 18; r < s / 2; r += 20) {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = shade(col, 0.12);
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, s - 16, s - 16);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* --------- Constructeurs par type. Renvoient un tableau de meshes. --------- */

const builders = {
  bed(w, d, h, col) {
    const parts = [];
    const baseH = 0.28, matH = 0.20;
    parts.push(at(rb(w, baseH, d, col, { radius: 0.04 }), 0, baseH / 2, 0));            // sommier
    parts.push(at(rb(w - 0.08, matH, d - 0.08, "#f3f0ea", { rough: 0.9, radius: 0.06 }),
      0, baseH + matH / 2, 0));                                                          // matelas
    parts.push(at(rb(w, 0.55, 0.08, col, { radius: 0.03 }), 0, 0.55 / 2 + baseH, -d / 2 + 0.04)); // tête
    const pw = (w - 0.18) / 2;
    for (const s of [-1, 1])
      parts.push(at(rb(pw, 0.10, 0.32, "#e8ecef", { rough: 0.95, radius: 0.05 }),
        s * (pw / 2 + 0.03), baseH + matH + 0.05, -d / 2 + 0.28));                       // oreillers
    return parts;
  },

  sofa(w, d, h, col) {
    const parts = [];
    const seatH = 0.38, armW = 0.16;
    parts.push(at(rb(w, seatH, d, col, { radius: 0.05 }), 0, seatH / 2, 0));             // assise
    parts.push(at(rb(w, 0.42, 0.18, col, { radius: 0.05 }), 0, seatH + 0.21, d / 2 - 0.09)); // dossier
    for (const s of [-1, 1])
      parts.push(at(rb(armW, 0.5, d, col, { radius: 0.05 }), s * (w / 2 - armW / 2), 0.25, 0)); // accoudoirs
    const cw = (w - 2 * armW - 0.06) / 2;
    for (const s of [-1, 1])
      parts.push(at(rb(cw, 0.14, d - 0.16, shade(col, 0.06), { rough: 0.9, radius: 0.06 }),
        s * (cw / 2 + 0.03), seatH + 0.07, -0.02));                                      // coussins
    return parts;
  },

  table(w, d, h, col) { return legged(w, d, h, col, 0.05); },
  desk(w, d, h, col) {
    const parts = legged(w, d, h, col, 0.05);
    parts.push(at(rb(w * 0.5, h - 0.12, d - 0.1, shade(col, -0.05), { radius: 0.02 }),
      w / 2 - w * 0.25 - 0.04, (h - 0.12) / 2, 0));                                      // caisson tiroirs
    return parts;
  },

  // Chaise de bureau / gaming : assise, dossier haut, colonne, pied étoile + roulettes.
  chair(w, d, h, col) {
    const parts = [];
    const seatH = 0.48;
    parts.push(at(rb(w, 0.09, d, col, { radius: 0.04 }), 0, seatH, 0));                  // assise
    parts.push(at(rb(w, Math.max(h - seatH, 0.4), 0.08, col, { radius: 0.05 }),
      0, seatH + Math.max(h - seatH, 0.4) / 2, d / 2 - 0.05));                           // dossier haut
    parts.push(at(rb(0.06, seatH - 0.14, 0.06, "#2a2a2e"), 0, (seatH - 0.14) / 2 + 0.08, 0)); // colonne
    parts.push(at(rb(w * 0.95, 0.05, 0.07, "#2a2a2e", { radius: 0.02 }), 0, 0.07, 0));   // pied étoile
    parts.push(at(rb(0.07, 0.05, d * 0.95, "#2a2a2e", { radius: 0.02 }), 0, 0.07, 0));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      parts.push(at(rb(0.07, 0.07, 0.07, "#141416", { radius: 0.035 }),
        sx * w * 0.42, 0.035, sz * d * 0.42));                                           // roulettes
    return parts;
  },

  "tv-unit"(w, d, h, col) {
    const parts = [at(rb(w, h, d, col, { radius: 0.02 }), 0, h / 2, 0)];
    parts.push(at(rb(w, 0.02, d, shade(col, 0.1)), 0, h - 0.01, 0));                     // plateau
    return parts;
  },
  tv(w, d, h, col) {
    const parts = [];
    const base = 0.5;
    parts.push(at(rb(w, h, d, "#141416", { rough: 0.35, radius: 0.01 }), 0, base + h / 2, 0)); // écran
    parts.push(at(rb(0.06, base, 0.06, "#333"), 0, base / 2, 0));                        // pied
    parts.push(at(rb(w * 0.3, 0.02, 0.14, "#333"), 0, 0.01, 0));                         // socle
    return parts;
  },

  fridge(w, d, h, col) {
    const parts = [at(rb(w, h, d, col, { rough: 0.35, metal: 0.4, radius: 0.02 }), 0, h / 2, 0)];
    parts.push(at(rb(0.03, h * 0.35, 0.03, "#8a8f95"), w / 2 - 0.06, h * 0.72, d / 2 - 0.02)); // poignée haut
    parts.push(at(rb(0.03, h * 0.25, 0.03, "#8a8f95"), w / 2 - 0.06, h * 0.28, d / 2 - 0.02)); // poignée bas
    return parts;
  },

  counter(w, d, h, col) {
    const parts = [at(rb(w, h - 0.04, d, col, { radius: 0.01 }), 0, (h - 0.04) / 2, 0)]; // caisson
    parts.push(at(rb(w + 0.02, 0.04, d + 0.02, "#cdc9c0", { rough: 0.35, radius: 0.01 }), 0, h - 0.02, 0)); // plan
    return parts;
  },

  dresser(w, d, h, col) { return drawers(w, d, h, col, 3); },
  // Étagère type casiers : grille de cases ouvertes (façon caisses empilées).
  storage(w, d, h, col) {
    const parts = [];
    const rows = Math.max(2, Math.round(h / 0.42));
    const th = 0.04;
    // Montants + haut/bas.
    parts.push(at(rb(w, th, d, col, { radius: 0.01 }), 0, th / 2, 0));
    parts.push(at(rb(w, th, d, col, { radius: 0.01 }), 0, h - th / 2, 0));
    parts.push(at(rb(th, h, d, col, { radius: 0.01 }), -w / 2 + th / 2, h / 2, 0));
    parts.push(at(rb(th, h, d, col, { radius: 0.01 }), w / 2 - th / 2, h / 2, 0));
    parts.push(at(rb(th, h, d, col, { radius: 0.01 }), 0, h / 2, 0)); // séparation verticale
    for (let i = 1; i < rows; i++)
      parts.push(at(rb(w, th, d, col, { radius: 0.01 }), 0, (h * i) / rows, 0)); // tablettes
    // Fond léger pour donner du corps.
    parts.push(at(rb(w - th, h - th, 0.02, shade(col, -0.12)), 0, h / 2, -d / 2 + 0.02));
    return parts;
  },
  // Tapis : plan fin avec motif concentrique.
  rug(w, d, h, col) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ map: rugTexture(col), roughness: 0.98 })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.006;
    m.receiveShadow = true;
    return [m];
  },
  // Lampadaire : base, pied, abat-jour.
  lamp(w, d, h, col) {
    const parts = [];
    parts.push(at(rb(0.3, 0.03, 0.3, "#2a2a2e", { radius: 0.02 }), 0, 0.015, 0));         // base
    parts.push(at(rb(0.04, h - 0.28, 0.04, "#2a2a2e"), 0, (h - 0.28) / 2, 0));            // pied
    parts.push(at(rb(0.34, 0.24, 0.34, col, { rough: 0.9, radius: 0.06 }), 0, h - 0.12, 0)); // abat-jour
    return parts;
  },

  shower(w, d, h, col) {
    const parts = [at(rb(w, 0.06, d, "#e9edee", { radius: 0.02 }), 0, 0.03, 0)];         // receveur
    const glass = new THREE.Mesh(
      new RoundedBoxGeometry(w, h - 0.06, d, 2, 0.01),
      new THREE.MeshPhysicalMaterial({ color: "#cfe0e5", roughness: 0.05, transparent: true, opacity: 0.22, transmission: 0.3 })
    );
    glass.position.set(0, (h - 0.06) / 2 + 0.06, 0);
    glass.castShadow = false;
    parts.push(glass);
    return parts;
  },
  toilet(w, d, h, col) {
    const parts = [];
    parts.push(at(rb(w, 0.4, d * 0.7, col, { rough: 0.4, radius: 0.08 }), 0, 0.2, d * 0.1)); // cuvette
    parts.push(at(rb(w, h - 0.4, 0.14, col, { rough: 0.4, radius: 0.03 }), 0, 0.4 + (h - 0.4) / 2, -d / 2 + 0.07)); // réservoir
    return parts;
  },
  sink(w, d, h, col) {
    const parts = [at(rb(w, 0.12, d, col, { rough: 0.4, radius: 0.03 }), 0, h - 0.06, 0)]; // vasque
    parts.push(at(rb(0.06, h - 0.12, 0.06, shade(col, -0.2)), 0, (h - 0.12) / 2, d / 2 - 0.08)); // colonne
    return parts;
  },

  default(w, d, h, col) { return [at(rb(w, h, d, col, { radius: 0.03 }), 0, h / 2, 0)]; },
};

function legged(w, d, h, col, top) {
  const parts = [at(rb(w, top, d, col, { radius: 0.02 }), 0, h - top / 2, 0)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    parts.push(at(rb(0.06, h - top, 0.06, shade(col, -0.12)),
      sx * (w / 2 - 0.06), (h - top) / 2, sz * (d / 2 - 0.06)));
  return parts;
}
function drawers(w, d, h, col, n) {
  const parts = [at(rb(w, h, d, col, { radius: 0.02 }), 0, h / 2, 0)];
  for (let i = 0; i < n; i++)
    parts.push(at(rb(0.14, 0.03, 0.03, shade(col, -0.18)), 0, h * ((i + 0.5) / n), d / 2 - 0.02)); // poignées
  return parts;
}

function makeLabel(text) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const scaleUp = 2; // netteté
  const pad = 20 * scaleUp;
  const fs = 34 * scaleUp;
  ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`;
  canvas.width = ctx.measureText(text).width + pad * 2;
  canvas.height = 58 * scaleUp;
  ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`;
  // Pastille claire, discrète, avec fine bordure.
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.strokeStyle = "rgba(30,35,45,0.12)";
  ctx.lineWidth = 2 * scaleUp;
  const r = 14 * scaleUp;
  ctx.beginPath();
  ctx.roundRect(ctx.lineWidth, ctx.lineWidth, canvas.width - 2 * ctx.lineWidth, canvas.height - 2 * ctx.lineWidth, r);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#3a3f4a";
  ctx.textBaseline = "middle";
  ctx.fillText(text, pad, canvas.height / 2 + 1 * scaleUp);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, opacity: 0.96 }));
  sprite.scale.set((canvas.width / scaleUp) * 0.0026, (canvas.height / scaleUp) * 0.0026, 1);
  sprite.name = "label";
  return sprite;
}

export function makeFurniture(item) {
  const group = new THREE.Group();
  group.name = "furniture:" + item.id;

  const build = builders[item.type] || builders.default;
  const parts = build(item.w, item.d, item.h, item.color || "#9a8478");
  parts.forEach((p) => group.add(p));

  // Boîte de clic transparente (englobe les pièces).
  const bbox = new THREE.Box3().setFromObject(group);
  const size = bbox.getSize(new THREE.Vector3());
  const center = bbox.getCenter(new THREE.Vector3());
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(size.x, 0.05), Math.max(size.y, 0.05), Math.max(size.z, 0.05)),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hitbox.position.copy(center);
  hitbox.userData.furnitureId = item.id;
  hitbox.userData.group = group;
  group.add(hitbox);

  const label = makeLabel(item.name);
  label.position.set(0, size.y + 0.22, 0);
  group.add(label);

  group.position.set(item.x, 0, item.z);
  group.rotation.y = THREE.MathUtils.degToRad(item.rotation || 0);
  group.userData = { item, parts, hitbox };
  return group;
}

export function buildFurniture(apartment) {
  const group = new THREE.Group();
  group.name = "furniture-root";
  const hitboxes = [];
  for (const item of apartment.furniture) {
    const g = makeFurniture(item);
    group.add(g);
    hitboxes.push(g.userData.hitbox);
  }
  return { group, hitboxes };
}

export function setLabelsVisible(furnitureRoot, visible) {
  furnitureRoot.traverse((o) => { if (o.name === "label") o.visible = visible; });
}

export function highlightFurniture(furnitureRoot, selectedId) {
  for (const g of furnitureRoot.children) {
    if (!g.userData || !g.userData.item) continue;
    const on = g.userData.item.id === selectedId;
    for (const p of g.userData.parts) {
      if (!p.material || !p.material.emissive) continue;
      p.material.emissive.set(on ? "#2563eb" : "#000000");
      p.material.emissiveIntensity = on ? 0.28 : 0;
    }
  }
}
