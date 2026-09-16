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

  chair(w, d, h, col) {
    const parts = [];
    const seatH = 0.45;
    parts.push(at(rb(w, 0.06, d, col, { radius: 0.02 }), 0, seatH, 0));                  // assise
    parts.push(at(rb(w, h - seatH, 0.06, col, { radius: 0.02 }), 0, seatH + (h - seatH) / 2, d / 2 - 0.03)); // dossier
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      parts.push(at(rb(0.05, seatH, 0.05, shade(col, -0.1)),
        sx * (w / 2 - 0.05), seatH / 2, sz * (d / 2 - 0.05)));                           // pieds
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
    parts.push(at(rb(w + 0.02, 0.04, d + 0.02, "#3b3f45", { rough: 0.4, radius: 0.01 }), 0, h - 0.02, 0)); // plan
    return parts;
  },

  dresser(w, d, h, col) { return drawers(w, d, h, col, 3); },
  storage(w, d, h, col) {
    const parts = [at(rb(w, h, d, col, { radius: 0.02 }), 0, h / 2, 0)];
    for (const y of [0.25, 0.5, 0.75])
      parts.push(at(rb(0.03, 0.12, 0.03, shade(col, -0.15)), w / 2 - 0.06, h * y, d / 2 - 0.02));
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
  const pad = 18;
  ctx.font = "600 42px Inter, system-ui, sans-serif";
  canvas.width = ctx.measureText(text).width + pad * 2;
  canvas.height = 66;
  ctx.font = "600 42px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(24,26,32,0.78)";
  const r = 16;
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, r);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, pad, canvas.height / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(canvas.width * 0.003, canvas.height * 0.003, 1);
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
