import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { store } from "./store.js";
import { buildApartment } from "./builder.js";
import { buildFurniture, setLabelsVisible, highlightFurniture } from "./furniture.js";
import { initUI } from "./ui.js";
import { IS_PLACEHOLDER } from "./apartment.js";

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();

// Fond en dégradé doux.
function gradientBackground() {
  const c = document.createElement("canvas");
  c.width = 2; c.height = 512;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, "#f7f9fc");
  grd.addColorStop(0.55, "#eaeef4");
  grd.addColorStop(1, "#dfe4ec");
  g.fillStyle = grd;
  g.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
scene.background = gradientBackground();

// --- Lumières (clé + remplissage + ambiance ciel/sol) ---
const hemi = new THREE.HemisphereLight("#ffffff", "#c3bfb4", 0.75);
scene.add(hemi);
scene.add(new THREE.AmbientLight("#ffffff", 0.25));

const sun = new THREE.DirectionalLight("#fff4e2", 1.5);
sun.position.set(7, 13, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -20;
sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20;
sun.shadow.camera.bottom = -20;
sun.shadow.bias = -0.0003;
sun.shadow.radius = 5;
scene.add(sun);

const fill = new THREE.DirectionalLight("#dce6ff", 0.5);
fill.position.set(-8, 6, -4);
scene.add(fill);

// Plan qui reçoit une ombre de contact douce (sol "propre").
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.ShadowMaterial({ opacity: 0.18 })
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = 0;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

// --- Caméras ---
const perspCam = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
let activeCam = perspCam;

const perspControls = new OrbitControls(perspCam, canvas);
perspControls.enableDamping = true;
perspControls.maxPolarAngle = Math.PI / 2 - 0.02; // ne pas passer sous le sol

const topControls = new OrbitControls(orthoCam, canvas);
topControls.enableRotate = false;
topControls.enableDamping = true;
topControls.enabled = false;

// --- État de scène ---
let shellGroup = null;
let ceilingsGroup = null;
let furnitureGroup = null;
let furnitureHitboxes = [];
let grid = null;
let bounds = null;
let selectedId = null;

const toggles = { roof: false, grid: false, labels: true };

function frameCameras() {
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  const maxDim = Math.max(size.x, size.z);

  // Zone d'affichage utile (le panneau à droite et la barre en haut recouvrent le canvas).
  const wide = window.innerWidth > 780;
  const panelPx = wide ? 340 : 0;
  const topPx = 72;
  const availW = Math.max(window.innerWidth - panelPx, 200);
  const availH = Math.max(window.innerHeight - topPx, 200);

  // --- Perspective : cible décalée pour centrer l'appart dans la zone utile ---
  const offX = (panelPx / window.innerWidth) * maxDim * 0.6;
  perspControls.target.set(center.x + offX, 0.8, center.z);
  perspCam.position.set(center.x + offX + maxDim * 0.85, maxDim * 1.05, center.z + maxDim * 1.15);
  perspCam.updateProjectionMatrix();

  // --- Ortho (plan) : on cadre l'appart dans la zone utile, frustum sur toute la fenêtre ---
  const pad = 1.12;
  const scale = Math.max((size.x * pad) / availW, (size.z * pad) / availH);
  const halfW = (scale * window.innerWidth) / 2;
  const halfH = (scale * window.innerHeight) / 2;
  orthoCam.left = -halfW; orthoCam.right = halfW;
  orthoCam.top = halfH; orthoCam.bottom = -halfH;
  const cx = center.x + (panelPx / 2) * scale; // décale le contenu vers la gauche
  const cz = center.z - (topPx / 2) * scale;
  orthoCam.position.set(cx, 30, cz);
  orthoCam.up.set(0, 0, -1);
  orthoCam.lookAt(cx, 0, cz);
  orthoCam.updateProjectionMatrix();
  topControls.target.set(cx, 0, cz);
}

function rebuildShell() {
  if (shellGroup) scene.remove(shellGroup);
  const built = buildApartment(store.get());
  shellGroup = built.group;
  ceilingsGroup = built.ceilings;
  ceilingsGroup.visible = toggles.roof;
  bounds = built.bounds;
  scene.add(shellGroup);

  if (grid) scene.remove(grid);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const center = new THREE.Vector3();
  bounds.getCenter(center);
  const g = Math.ceil(Math.max(size.x, size.z)) + 6;
  grid = new THREE.GridHelper(g, g, "#d3d8e0", "#e6eaf0");
  grid.material.opacity = 0.5;
  grid.material.transparent = true;
  grid.position.set(center.x, 0.001, center.z);
  grid.visible = toggles.grid;
  scene.add(grid);
}

function rebuildFurniture() {
  if (furnitureGroup) scene.remove(furnitureGroup);
  const built = buildFurniture(store.get());
  furnitureGroup = built.group;
  furnitureHitboxes = built.hitboxes;
  scene.add(furnitureGroup);
  setLabelsVisible(furnitureGroup, toggles.labels);
  applySelection();
}

function applySelection() {
  if (furnitureGroup) highlightFurniture(furnitureGroup, selectedId);
}

// ---- Déplacement des meubles à la souris ----
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let dragging = null;
let dragOffset = new THREE.Vector3();

function pointerToNDC(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

function onPointerDown(e) {
  if (e.button !== 0) return;
  pointerToNDC(e);
  raycaster.setFromCamera(pointer, activeCam);
  const hits = raycaster.intersectObjects(furnitureHitboxes, false);
  if (!hits.length) return;

  const mesh = hits[0].object;
  const group = mesh.userData.group;
  selectedId = mesh.userData.furnitureId;
  applySelection();

  const hitPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(dragPlane, hitPoint);
  dragOffset.copy(group.position).sub(hitPoint);
  dragging = group;

  perspControls.enabled = false;
  topControls.enabled = false;
  canvas.style.cursor = "grabbing";
}

function onPointerMove(e) {
  if (!dragging) return;
  pointerToNDC(e);
  raycaster.setFromCamera(pointer, activeCam);
  const p = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(dragPlane, p)) return;
  p.add(dragOffset);
  const snap = (v) => Math.round(v / 0.05) * 0.05;
  dragging.position.x = snap(p.x);
  dragging.position.z = snap(p.z);
}

function onPointerUp() {
  if (dragging) {
    const id = dragging.userData.item.id;
    store.updateFurniture(id, {
      x: +dragging.position.x.toFixed(3),
      z: +dragging.position.z.toFixed(3),
    }, false);
    dragging = null;
  }
  perspControls.enabled = activeCam === perspCam;
  topControls.enabled = activeCam === orthoCam;
  canvas.style.cursor = "";
}

canvas.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);

// ---- Vues ----
function setView(mode) {
  const is3D = mode === "3d";
  activeCam = is3D ? perspCam : orthoCam;
  perspControls.enabled = is3D;
  topControls.enabled = !is3D;
  document.getElementById("view-3d").classList.toggle("active", is3D);
  document.getElementById("view-top").classList.toggle("active", !is3D);
  document.getElementById("hud-hint").textContent = is3D
    ? "Clique-glisse un meuble pour le déplacer • molette pour zoomer • clic droit pour tourner la vue"
    : "Vue plan : clique-glisse un meuble pour le positionner au centimètre • molette pour zoomer";
}

// ---- Toolbar ----
document.getElementById("view-3d").addEventListener("click", () => setView("3d"));
document.getElementById("view-top").addEventListener("click", () => setView("top"));
document.getElementById("toggle-roof").addEventListener("click", (e) => {
  toggles.roof = !toggles.roof;
  if (ceilingsGroup) ceilingsGroup.visible = toggles.roof;
  e.currentTarget.classList.toggle("active", toggles.roof);
});
document.getElementById("toggle-grid").addEventListener("click", (e) => {
  toggles.grid = !toggles.grid;
  if (grid) grid.visible = toggles.grid;
  e.currentTarget.classList.toggle("active", toggles.grid);
});
document.getElementById("toggle-labels").addEventListener("click", (e) => {
  toggles.labels = !toggles.labels;
  setLabelsVisible(furnitureGroup, toggles.labels);
  e.currentTarget.classList.toggle("active", toggles.labels);
});
document.getElementById("export-json").addEventListener("click", () => store.exportJSON());
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Réinitialiser depuis la configuration d'origine ? Tes modifications seront perdues.")) store.reset();
});
const fileInput = document.getElementById("file-input");
document.getElementById("import-json").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  try {
    store.importJSON(await file.text());
  } catch (err) {
    alert("Import impossible : " + err.message);
  }
  fileInput.value = "";
});

// ---- UI latérale ----
const ui = initUI({
  onSelectFurniture: (id) => {
    selectedId = id;
    applySelection();
  },
  onFocusRoom: (roomId) => {
    const r = store.get().rooms.find((x) => x.id === roomId);
    if (!r) return;
    const cx = r.x + r.width / 2;
    const cz = r.z + r.depth / 2;
    perspControls.target.set(cx, 1, cz);
    const d = Math.max(r.width, r.depth) * 1.6 + 2;
    perspCam.position.set(cx + d * 0.6, d, cz + d * 0.6);
  },
});

// ---- Réaction aux changements du store ----
store.addEventListener("change", (e) => {
  ui.refresh();
  if (e.detail.rebuild) {
    rebuildShell();
    rebuildFurniture();
  }
});

// ---- Init ----
rebuildShell();
rebuildFurniture();
frameCameras();
setView("3d");

if (IS_PLACEHOLDER) {
  const banner = document.createElement("div");
  banner.id = "placeholder-banner";
  banner.innerHTML =
    "⚠️ Dimensions <b>approximatives</b> (d'après les croquis). À ajuster avec les vraies mesures.";
  document.getElementById("app").appendChild(banner);
}

// ---- Boucle de rendu ----
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  perspCam.aspect = w / h;
  perspCam.updateProjectionMatrix();
  if (bounds) frameCameras();
}
window.addEventListener("resize", resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  perspControls.update();
  topControls.update();
  renderer.render(scene, activeCam);
}
animate();
