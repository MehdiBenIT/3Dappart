import * as THREE from "three";

/*
 * Construit la "coque" de l'appartement (sols, murs, fenêtres + encadrements,
 * radiateurs, plafonds) à partir de la configuration. Les meubles sont gérés
 * à part (furniture.js) car ils sont déplaçables.
 */

// Palette "diorama nocturne" (inspiration : lavande + rose poudré + socle prune).
const COLORS = {
  wall: "#e7e1f2",       // lavande (extérieur)
  accent: "#e0568a",     // rose magenta (murs d'accent)
  slab: "#2b2340",       // socle prune sombre
  skirting: "#d8477f",   // plinthe magenta
};

function makeWallMat() {
  return new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.9 });
}
const MATS = {
  ceiling: new THREE.MeshStandardMaterial({
    color: "#ffffff", roughness: 1, transparent: true, opacity: 0.9,
    side: THREE.DoubleSide,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: "#cdd6ec", roughness: 0.05, metalness: 0,
    transparent: true, opacity: 0.3, transmission: 0.2,
  }),
  frame: new THREE.MeshStandardMaterial({ color: "#f3eff7", roughness: 0.6 }),
  radiator: new THREE.MeshStandardMaterial({ color: "#faf7fb", roughness: 0.45, metalness: 0.1 }),
  slab: new THREE.MeshStandardMaterial({ color: COLORS.slab, roughness: 0.85 }),
  skirting: new THREE.MeshStandardMaterial({ color: COLORS.skirting, roughness: 0.55 }),
  blind: new THREE.MeshStandardMaterial({ color: "#4a4360", roughness: 0.7 }),
};

function sideFrame(room, side) {
  const { x, z, width, depth } = room;
  switch (side) {
    case "N": return { sx: x,         sz: z,         dx: 1, dz: 0, inx: 0, inz: 1 };
    case "S": return { sx: x,         sz: z + depth, dx: 1, dz: 0, inx: 0, inz: -1 };
    case "W": return { sx: x,         sz: z,         dx: 0, dz: 1, inx: 1, inz: 0 };
    case "E": return { sx: x + width, sz: z,         dx: 0, dz: 1, inx: -1, inz: 0 };
    default: throw new Error("Côté inconnu: " + side);
  }
}

const isVertical = (side) => side === "W" || side === "E";
function wallLength(room, side) {
  return side === "N" || side === "S" ? room.width : room.depth;
}

function wallShape(length, height, openings) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(length, 0);
  shape.lineTo(length, height);
  shape.lineTo(0, height);
  shape.closePath();

  for (const op of openings) {
    const sill = op.type === "door" || op.type === "opening" ? 0 : op.sill ?? 0.9;
    const top = Math.min(height, sill + op.height);
    const hole = new THREE.Path();
    hole.moveTo(op.offset, sill);
    hole.lineTo(op.offset + op.width, sill);
    hole.lineTo(op.offset + op.width, top);
    hole.lineTo(op.offset, top);
    hole.closePath();
    shape.holes.push(hole);
  }
  return shape;
}

function wallGeometry(length, height, thickness, openings) {
  const geo = new THREE.ExtrudeGeometry(wallShape(length, height, openings), {
    depth: thickness, bevelEnabled: false,
  });
  geo.computeVertexNormals();
  return geo;
}

// Doublure intérieure rose (face intérieure du mur), avec les mêmes ouvertures.
const LINER_EPS = 0.004;
function addWallLiner(group, room, side, t, H, ops, roomId) {
  const len = wallLength(room, side);
  const geo = new THREE.ShapeGeometry(wallShape(len, H, ops));
  const mat = new THREE.MeshStandardMaterial({ color: COLORS.accent, roughness: 0.92, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  m.userData.isWall = true;
  m.userData.roomId = roomId;
  switch (side) {
    case "N": m.rotation.y = 0; m.position.set(room.x, 0, room.z + t / 2 + LINER_EPS); break;
    case "S": m.rotation.y = 0; m.position.set(room.x, 0, room.z + room.depth - t / 2 - LINER_EPS); break;
    case "W": m.rotation.y = -Math.PI / 2; m.position.set(room.x + t / 2 + LINER_EPS, 0, room.z); break;
    case "E": m.rotation.y = -Math.PI / 2; m.position.set(room.x + room.width - t / 2 - LINER_EPS, 0, room.z); break;
  }
  group.add(m);
}

function placeWall(mesh, room, side, t) {
  switch (side) {
    case "N": mesh.rotation.y = 0; mesh.position.set(room.x, 0, room.z - t / 2); break;
    case "S": mesh.rotation.y = 0; mesh.position.set(room.x, 0, room.z + room.depth - t / 2); break;
    case "W": mesh.rotation.y = -Math.PI / 2; mesh.position.set(room.x + t / 2, 0, room.z); break;
    case "E": mesh.rotation.y = -Math.PI / 2; mesh.position.set(room.x + room.width + t / 2, 0, room.z); break;
  }
}

// Encadrement (menuiserie) autour d'une ouverture : 4 côtés (fenêtre) ou 3 (porte).
// Pour les fenêtres, ajoute aussi un store (masqué par défaut) au groupe `blinds`.
function addOpeningFrame(group, room, side, op, t, blinds) {
  const fr = sideFrame(room, side);
  const sill = op.type === "window" ? (op.sill ?? 0.9) : 0;
  const cx = fr.sx + fr.dx * (op.offset + op.width / 2);
  const cz = fr.sz + fr.dz * (op.offset + op.width / 2);
  const cy = sill + op.height / 2;

  const sub = new THREE.Group();
  sub.position.set(cx, cy, cz);
  sub.rotation.y = isVertical(side) ? Math.PI / 2 : 0;

  const fw = 0.05;               // section de la menuiserie
  const depth = t + 0.03;        // dépasse un peu du mur
  const W = op.width, Hh = op.height;
  const bar = (w, h, x, y) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), MATS.frame);
    m.position.set(x, y, 0);
    m.castShadow = true;
    sub.add(m);
  };
  bar(W + 2 * fw, fw, 0, Hh / 2 + fw / 2);          // haut
  bar(fw, Hh + 2 * fw, -(W / 2 + fw / 2), 0);       // gauche
  bar(fw, Hh + 2 * fw, W / 2 + fw / 2, 0);          // droite
  if (op.type === "window") {
    bar(W + 2 * fw, fw, 0, -(Hh / 2 + fw / 2));     // bas (appui)
    const pane = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, 0.02), MATS.glass);
    sub.add(pane);
    const meneau = new THREE.Mesh(new THREE.BoxGeometry(0.03, Hh, depth * 0.9), MATS.frame);
    sub.add(meneau);

    // Store (baissé), masqué par défaut — activable via le bouton "Stores".
    if (blinds) {
      const blind = new THREE.Group();
      blind.position.set(cx, cy, cz);
      blind.rotation.y = isVertical(side) ? Math.PI / 2 : 0;
      const slats = 8;
      for (let i = 0; i < slats; i++) {
        const s = new THREE.Mesh(
          new THREE.BoxGeometry(W - 0.02, Hh / slats - 0.008, 0.02),
          MATS.blind
        );
        s.position.set(0, Hh / 2 - (i + 0.5) * (Hh / slats), 0.015);
        blind.add(s);
      }
      blinds.add(blind);
    }
  }
  group.add(sub);
}

// Plinthe magenta le long du pied d'un mur (côté intérieur).
function addSkirting(group, room, side, t) {
  const fr = sideFrame(room, side);
  const len = side === "N" || side === "S" ? room.width : room.depth;
  const h = 0.06;
  const cx = fr.sx + fr.dx * (len / 2) + fr.inx * (t / 2 + 0.015);
  const cz = fr.sz + fr.dz * (len / 2) + fr.inz * (t / 2 + 0.015);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.03), MATS.skirting);
  bar.rotation.y = isVertical(side) ? Math.PI / 2 : 0;
  bar.position.set(cx, h / 2, cz);
  group.add(bar);
}

// Active/désactive la transparence des murs (mode "voir dedans").
export function setWallsTransparent(shellGroup, on) {
  if (!shellGroup) return;
  shellGroup.traverse((o) => {
    if (o.userData && o.userData.isWall && o.material) {
      o.material.transparent = on;
      o.material.opacity = on ? 0.15 : 1;
      o.material.depthWrite = !on;
    }
  });
}

export function buildApartment(apartment, options = {}) {
  const group = new THREE.Group();
  group.name = "shell";
  const t = apartment.wallThickness;
  const H = options.wallHeight || apartment.wallHeight;

  const ceilings = new THREE.Group();
  ceilings.name = "ceilings";
  ceilings.visible = false;

  const blinds = new THREE.Group();
  blinds.name = "blinds";
  blinds.visible = false;

  const lowWalls = H < 1.2; // mode "murs baissés" → on masque menuiseries/radiateurs

  const bounds = new THREE.Box3(
    new THREE.Vector3(Infinity, 0, Infinity),
    new THREE.Vector3(-Infinity, H, -Infinity)
  );

  for (const room of apartment.rooms) {
    bounds.min.x = Math.min(bounds.min.x, room.x);
    bounds.min.z = Math.min(bounds.min.z, room.z);
    bounds.max.x = Math.max(bounds.max.x, room.x + room.width);
    bounds.max.z = Math.max(bounds.max.z, room.z + room.depth);

    const cx = room.x + room.width / 2;
    const cz = room.z + room.depth / 2;

    // --- Socle flottant (effet diorama) ---
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(room.width + 0.3, 0.5, room.depth + 0.3),
      MATS.slab
    );
    slab.position.set(cx, -0.25, cz);
    slab.receiveShadow = true;
    group.add(slab);

    // --- Sol ---
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(room.width, room.depth),
      new THREE.MeshStandardMaterial({ color: room.floorColor || "#f0dee0", roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0.002, cz);
    floor.receiveShadow = true;
    group.add(floor);

    // --- Plafond (masqué par défaut) ---
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(room.width, room.depth), MATS.ceiling);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, H, cz);
    ceilings.add(ceil);

    // --- Murs (lavande dehors + doublure rose dedans) + menuiseries ---
    for (const side of ["N", "S", "E", "W"]) {
      const ops = (room.openings || []).filter((o) => o.side === side);
      const wall = new THREE.Mesh(wallGeometry(wallLength(room, side), H, t, ops), makeWallMat());
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.userData.isWall = true;
      wall.userData.roomId = room.id;
      placeWall(wall, room, side, t);
      group.add(wall);

      // Doublure intérieure rose (avec les ouvertures).
      addWallLiner(group, room, side, t, H, ops, room.id);

      // Plinthe magenta au pied du mur (côté intérieur).
      addSkirting(group, room, side, t);

      if (!lowWalls) {
        for (const op of ops) {
          if (op.type !== "opening") addOpeningFrame(group, room, side, op, t, blinds);
        }
      }
    }

    // --- Radiateurs (panneau + fines nervures) ---
    for (const rad of (lowWalls ? [] : room.radiators || [])) {
      const fr = sideFrame(room, rad.side);
      const cx = fr.sx + fr.dx * (rad.offset + rad.width / 2) + fr.inx * (t / 2 + 0.06);
      const cz = fr.sz + fr.dz * (rad.offset + rad.width / 2) + fr.inz * (t / 2 + 0.06);
      const h = rad.height || 0.6;
      const rm = new THREE.Mesh(new THREE.BoxGeometry(rad.width, h, 0.09), MATS.radiator);
      rm.rotation.y = isVertical(rad.side) ? Math.PI / 2 : 0;
      rm.position.set(cx, 0.18 + h / 2, cz);
      rm.castShadow = true;
      rm.receiveShadow = true;
      group.add(rm);
    }
  }

  group.add(ceilings);
  group.add(blinds);
  bounds.min.y = 0;
  bounds.max.y = H;
  return { group, ceilings, blinds, bounds };
}

// Focalise une pièce : les murs des autres pièces deviennent translucides.
export function setFocusRoom(shellGroup, roomId) {
  if (!shellGroup) return;
  shellGroup.traverse((o) => {
    if (o.userData && o.userData.isWall && o.material) {
      const dim = roomId && o.userData.roomId !== roomId;
      o.material.transparent = dim;
      o.material.opacity = dim ? 0.12 : 1;
      o.material.depthWrite = !dim;
    }
  });
}
