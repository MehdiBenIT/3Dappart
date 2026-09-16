import * as THREE from "three";

/*
 * Construit la "coque" de l'appartement (sols, murs, fenêtres + encadrements,
 * radiateurs, plafonds) à partir de la configuration. Les meubles sont gérés
 * à part (furniture.js) car ils sont déplaçables.
 */

const MATS = {
  wall: new THREE.MeshStandardMaterial({ color: "#f4f2ee", roughness: 0.97 }),
  ceiling: new THREE.MeshStandardMaterial({
    color: "#ffffff", roughness: 1, transparent: true, opacity: 0.9,
    side: THREE.DoubleSide,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: "#cfe4ec", roughness: 0.05, metalness: 0,
    transparent: true, opacity: 0.28, transmission: 0.2,
  }),
  frame: new THREE.MeshStandardMaterial({ color: "#eeece7", roughness: 0.6 }),
  radiator: new THREE.MeshStandardMaterial({ color: "#fafafa", roughness: 0.45, metalness: 0.1 }),
  skirting: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.7 }),
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

function wallGeometry(length, height, thickness, openings) {
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

  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.computeVertexNormals();
  return geo;
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
function addOpeningFrame(group, room, side, op, t) {
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
    // Vitre + petit meneau central.
    const pane = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, 0.02), MATS.glass);
    sub.add(pane);
    const meneau = new THREE.Mesh(new THREE.BoxGeometry(0.03, Hh, depth * 0.9), MATS.frame);
    sub.add(meneau);
  }
  group.add(sub);
}

export function buildApartment(apartment) {
  const group = new THREE.Group();
  group.name = "shell";
  const t = apartment.wallThickness;
  const H = apartment.wallHeight;

  const ceilings = new THREE.Group();
  ceilings.name = "ceilings";
  ceilings.visible = false;

  const bounds = new THREE.Box3(
    new THREE.Vector3(Infinity, 0, Infinity),
    new THREE.Vector3(-Infinity, H, -Infinity)
  );

  for (const room of apartment.rooms) {
    bounds.min.x = Math.min(bounds.min.x, room.x);
    bounds.min.z = Math.min(bounds.min.z, room.z);
    bounds.max.x = Math.max(bounds.max.x, room.x + room.width);
    bounds.max.z = Math.max(bounds.max.z, room.z + room.depth);

    // --- Sol ---
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(room.width, room.depth),
      new THREE.MeshStandardMaterial({ color: room.floorColor || "#e6dccb", roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(room.x + room.width / 2, 0.002, room.z + room.depth / 2);
    floor.receiveShadow = true;
    group.add(floor);

    // --- Plafond (masqué par défaut) ---
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(room.width, room.depth), MATS.ceiling);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(room.x + room.width / 2, H, room.z + room.depth / 2);
    ceilings.add(ceil);

    // --- Murs + menuiseries ---
    for (const side of ["N", "S", "E", "W"]) {
      const ops = (room.openings || []).filter((o) => o.side === side);
      const wall = new THREE.Mesh(wallGeometry(wallLength(room, side), H, t, ops), MATS.wall);
      wall.castShadow = true;
      wall.receiveShadow = true;
      placeWall(wall, room, side, t);
      group.add(wall);

      for (const op of ops) {
        if (op.type !== "opening") addOpeningFrame(group, room, side, op, t);
      }
    }

    // --- Radiateurs (panneau + fines nervures) ---
    for (const rad of room.radiators || []) {
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
  bounds.min.y = 0;
  bounds.max.y = H;
  return { group, ceilings, bounds };
}
