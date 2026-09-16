import * as THREE from "three";

/*
 * Construit la "coque" de l'appartement (sols, murs, fenêtres, radiateurs,
 * plafonds) à partir de la configuration. Les meubles sont gérés à part
 * (furniture.js) car ils sont déplaçables.
 */

const MATS = {
  wall: new THREE.MeshStandardMaterial({ color: "#f2efe9", roughness: 0.95 }),
  ceiling: new THREE.MeshStandardMaterial({
    color: "#ffffff", roughness: 1, transparent: true, opacity: 0.0,
    side: THREE.DoubleSide,
  }),
  glass: new THREE.MeshStandardMaterial({
    color: "#a9d4e5", roughness: 0.1, metalness: 0, transparent: true, opacity: 0.35,
  }),
  frame: new THREE.MeshStandardMaterial({ color: "#e8e8e8", roughness: 0.8 }),
  radiator: new THREE.MeshStandardMaterial({ color: "#f7f7f7", roughness: 0.6 }),
};

// Renvoie un repère local pour un côté de pièce : coin de départ (monde x/z),
// direction le long du mur (offset croissant), et normale vers l'intérieur.
function sideFrame(room, side) {
  const { x, z, width, depth } = room;
  switch (side) {
    case "N": return { sx: x,         sz: z,         dx: 1, dz: 0, inx: 0, inz: 1, lineAxis: "z", line: z };
    case "S": return { sx: x,         sz: z + depth, dx: 1, dz: 0, inx: 0, inz: -1, lineAxis: "z", line: z + depth };
    case "W": return { sx: x,         sz: z,         dx: 0, dz: 1, inx: 1, inz: 0, lineAxis: "x", line: x };
    case "E": return { sx: x + width, sz: z,         dx: 0, dz: 1, inx: -1, inz: 0, lineAxis: "x", line: x + width };
    default: throw new Error("Côté inconnu: " + side);
  }
}

function wallLength(room, side) {
  return side === "N" || side === "S" ? room.width : room.depth;
}

// Géométrie d'un mur (longueur × hauteur), extrudée sur l'épaisseur t,
// avec des trous rectangulaires pour les ouvertures.
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
    const x0 = op.offset;
    const x1 = op.offset + op.width;
    const hole = new THREE.Path();
    hole.moveTo(x0, sill);
    hole.lineTo(x1, sill);
    hole.lineTo(x1, top);
    hole.lineTo(x0, top);
    hole.closePath();
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.computeVertexNormals();
  return geo;
}

// Place un mur dans le monde selon son côté.
function placeWall(mesh, room, side, thickness) {
  const t = thickness;
  switch (side) {
    case "N": mesh.rotation.y = 0; mesh.position.set(room.x, 0, room.z - t / 2); break;
    case "S": mesh.rotation.y = 0; mesh.position.set(room.x, 0, room.z + room.depth - t / 2); break;
    case "W": mesh.rotation.y = -Math.PI / 2; mesh.position.set(room.x + t / 2, 0, room.z); break;
    case "E": mesh.rotation.y = -Math.PI / 2; mesh.position.set(room.x + room.width + t / 2, 0, room.z); break;
  }
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
    // Étendre les bornes globales.
    bounds.min.x = Math.min(bounds.min.x, room.x);
    bounds.min.z = Math.min(bounds.min.z, room.z);
    bounds.max.x = Math.max(bounds.max.x, room.x + room.width);
    bounds.max.z = Math.max(bounds.max.z, room.z + room.depth);

    // --- Sol ---
    const floorGeo = new THREE.PlaneGeometry(room.width, room.depth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: room.floorColor || "#d9c7a3", roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(room.x + room.width / 2, 0.001, room.z + room.depth / 2);
    floor.receiveShadow = true;
    floor.userData.roomLabel = room.name;
    group.add(floor);

    // --- Plafond (masqué par défaut) ---
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(room.width, room.depth), MATS.ceiling.clone());
    ceil.material.opacity = 0.9;
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(room.x + room.width / 2, H, room.z + room.depth / 2);
    ceilings.add(ceil);

    // --- Murs ---
    for (const side of ["N", "S", "E", "W"]) {
      const ops = (room.openings || []).filter((o) => o.side === side);
      const geo = wallGeometry(wallLength(room, side), H, t, ops);
      const wall = new THREE.Mesh(geo, MATS.wall);
      wall.castShadow = true;
      wall.receiveShadow = true;
      placeWall(wall, room, side, t);
      group.add(wall);

      // Vitres pour les fenêtres.
      for (const op of ops.filter((o) => o.type === "window")) {
        const fr = sideFrame(room, side);
        const cx = fr.sx + fr.dx * (op.offset + op.width / 2);
        const cz = fr.sz + fr.dz * (op.offset + op.width / 2);
        const cy = (op.sill ?? 0.9) + op.height / 2;
        const pane = new THREE.Mesh(
          new THREE.BoxGeometry(op.width, op.height, 0.03),
          MATS.glass
        );
        pane.rotation.y = side === "W" || side === "E" ? Math.PI / 2 : 0;
        pane.position.set(cx, cy, cz);
        group.add(pane);
      }
    }

    // --- Radiateurs ---
    for (const rad of room.radiators || []) {
      const fr = sideFrame(room, rad.side);
      const cx = fr.sx + fr.dx * (rad.offset + rad.width / 2) + fr.inx * (t / 2 + 0.05);
      const cz = fr.sz + fr.dz * (rad.offset + rad.width / 2) + fr.inz * (t / 2 + 0.05);
      const h = rad.height || 0.6;
      const rm = new THREE.Mesh(
        new THREE.BoxGeometry(rad.width, h, 0.08),
        MATS.radiator
      );
      rm.rotation.y = rad.side === "W" || rad.side === "E" ? Math.PI / 2 : 0;
      rm.position.set(cx, 0.15 + h / 2, cz);
      rm.castShadow = true;
      group.add(rm);
    }
  }

  group.add(ceilings);
  bounds.min.y = 0;
  bounds.max.y = H;
  return { group, ceilings, bounds };
}
