import * as THREE from "three";

/*
 * Meubles : chaque meuble est un Group contenant une boîte (aux dimensions
 * réelles) + une étiquette flottante. Les coordonnées x,z d'un meuble
 * désignent son CENTRE au sol. `rotation` est un angle (degrés) autour de Y.
 */

function makeLabel(text) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const pad = 16;
  ctx.font = "600 44px system-ui, sans-serif";
  const w = ctx.measureText(text).width + pad * 2;
  canvas.width = w;
  canvas.height = 72;
  ctx.font = "600 44px system-ui, sans-serif";
  ctx.fillStyle = "rgba(20,20,25,0.82)";
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 14);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, pad, canvas.height / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const scale = 0.0032;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  sprite.name = "label";
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function makeFurniture(item) {
  const group = new THREE.Group();
  group.name = "furniture:" + item.id;

  const mat = new THREE.MeshStandardMaterial({ color: item.color || "#8d6e63", roughness: 0.7 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(item.w, item.h, item.d), mat);
  box.position.y = item.h / 2;
  box.castShadow = true;
  box.receiveShadow = true;
  box.userData.furnitureId = item.id;
  box.userData.group = group;
  group.add(box);

  const label = makeLabel(item.name);
  label.position.set(0, item.h + 0.22, 0);
  group.add(label);

  group.position.set(item.x, 0, item.z);
  group.rotation.y = THREE.MathUtils.degToRad(item.rotation || 0);
  group.userData.item = item;
  return group;
}

export function buildFurniture(apartment) {
  const group = new THREE.Group();
  group.name = "furniture-root";
  const meshes = [];
  for (const item of apartment.furniture) {
    const g = makeFurniture(item);
    group.add(g);
    meshes.push(g.children[0]); // la boîte, cible du raycast
  }
  return { group, meshes };
}

export function setLabelsVisible(furnitureRoot, visible) {
  furnitureRoot.traverse((o) => {
    if (o.name === "label") o.visible = visible;
  });
}
