import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
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
renderer.toneMappingExposure = 0.97;

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

// --- Éclairage image-based (IBL) : lumière douce et réaliste ---
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

// --- Lumières d'appoint (le soleil porte les ombres) ---
const hemi = new THREE.HemisphereLight("#ffffff", "#cdc8bd", 0.22);
scene.add(hemi);

const sun = new THREE.DirectionalLight("#fff6ea", 1.7);
sun.position.set(7, 14, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -20;
sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20;
sun.shadow.camera.bottom = -20;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 6;
scene.add(sun);

const fill = new THREE.DirectionalLight("#e6ecff", 0.28);
fill.position.set(-9, 7, -5);
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
let renderPass = null;
let gtaoPass = null;

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
// "3d" = perspective inclinée · "dessus" = perspective à la verticale (3D) · "plan" = orthographique à plat
let currentView = "3d";

// Place la caméra perspective à la verticale, au-dessus du centre (vue de dessus 3D).
function setPerspTop() {
  const size = new THREE.Vector3(); bounds.getSize(size);
  const center = new THREE.Vector3(); bounds.getCenter(center);
  const maxDim = Math.max(size.x, size.z);
  const wide = window.innerWidth > 780;
  const offX = wide ? (340 / window.innerWidth) * maxDim * 0.6 : 0;
  perspControls.target.set(center.x + offX, 0, center.z);
  // Vue quasi-verticale, mais vue depuis un peu au sud (offset en Z) pour garder
  // le nord en haut sans "roulis" et laisser un léger relief 3D.
  perspCam.position.set(center.x + offX, maxDim * 1.75, center.z + maxDim * 0.28);
  perspCam.updateProjectionMatrix();
}

function setView(mode) {
  currentView = mode;
  const usePersp = mode !== "plan";
  activeCam = usePersp ? perspCam : orthoCam;
  if (renderPass) renderPass.camera = activeCam;
  if (gtaoPass) gtaoPass.camera = activeCam;
  perspControls.enabled = usePersp;
  topControls.enabled = !usePersp;

  if (mode === "dessus") setPerspTop();
  else if (mode === "3d") frameCameras();

  document.getElementById("view-3d").classList.toggle("active", mode === "3d");
  document.getElementById("view-dessus").classList.toggle("active", mode === "dessus");
  document.getElementById("view-top").classList.toggle("active", mode === "plan");

  const hints = {
    "3d": "Clique-glisse un meuble pour le déplacer • molette pour zoomer • clic droit pour tourner la vue",
    dessus: "Vue de dessus 3D • clique-glisse un meuble pour le déplacer • molette pour zoomer",
    plan: "Vue plan • clique-glisse un meuble pour le positionner au centimètre • molette pour zoomer",
  };
  document.getElementById("hud-hint").textContent = hints[mode];
}

// ---- Toolbar ----
document.getElementById("view-3d").addEventListener("click", () => setView("3d"));
document.getElementById("view-dessus").addEventListener("click", () => setView("dessus"));
document.getElementById("view-top").addEventListener("click", () => setView("plan"));
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

// ---- Post-processing : occlusion ambiante douce (GTAO) + sortie tonemappée ----
const composer = new EffectComposer(renderer);
renderPass = new RenderPass(scene, activeCam);
gtaoPass = new GTAOPass(scene, activeCam, window.innerWidth, window.innerHeight);
gtaoPass.output = GTAOPass.OUTPUT.Default;
gtaoPass.updateGtaoMaterial({
  radius: 0.5, distanceExponent: 1, thickness: 1, scale: 1,
  samples: 16, distanceFallOff: 1, screenSpaceRadius: false,
});
composer.addPass(renderPass);
composer.addPass(gtaoPass);
composer.addPass(new OutputPass());

// ---- Boucle de rendu ----
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  gtaoPass.setSize(w, h);
  perspCam.aspect = w / h;
  perspCam.updateProjectionMatrix();
  if (bounds) {
    frameCameras();
    if (currentView === "dessus") setPerspTop();
  }
}
window.addEventListener("resize", resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  perspControls.update();
  topControls.update();
  composer.render();
}
animate();
