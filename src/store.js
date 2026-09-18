import { apartment as defaultApartment } from "./apartment.js";

/*
 * État de l'application : la configuration courante de l'appartement.
 * Sauvegarde automatique dans le localStorage pour ne rien perdre entre
 * deux sessions. Import / export JSON pour partager ou archiver.
 */

const KEY = "appart-3d:v1";

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

class Store extends EventTarget {
  constructor() {
    super();
    this.state = this._load();
    if (!this.state.shopping) this.state.shopping = [];
    if (!this.state.inspiration) this.state.inspiration = clone(defaultApartment.inspiration || []);
  }

  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Lecture localStorage impossible:", e);
    }
    return clone(defaultApartment);
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn("Sauvegarde localStorage impossible:", e);
    }
  }

  // Notifie l'UI qu'il faut se rafraîchir. `rebuild` = reconstruire la 3D.
  _emit(rebuild = false) {
    this.save();
    this.dispatchEvent(new CustomEvent("change", { detail: { rebuild } }));
  }

  get() {
    return this.state;
  }

  furniture(id) {
    return this.state.furniture.find((f) => f.id === id);
  }

  updateFurniture(id, patch, rebuild = false) {
    const f = this.furniture(id);
    if (!f) return;
    Object.assign(f, patch);
    this._emit(rebuild);
  }

  addFurniture(item) {
    this.state.furniture.push(item);
    this._emit(true);
  }

  removeFurniture(id) {
    this.state.furniture = this.state.furniture.filter((f) => f.id !== id);
    this._emit(true);
  }

  addShopping(entry) {
    this.state.shopping.push(entry);
    this._emit(false);
  }

  updateShopping(id, patch) {
    const s = this.state.shopping.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
    this._emit(false);
  }

  removeShopping(id) {
    this.state.shopping = this.state.shopping.filter((x) => x.id !== id);
    this._emit(false);
  }

  addInspiration(entry) {
    if (!this.state.inspiration) this.state.inspiration = [];
    this.state.inspiration.push(entry);
    this._emit(false);
  }

  removeInspiration(id) {
    this.state.inspiration = (this.state.inspiration || []).filter((x) => x.id !== id);
    this._emit(false);
  }

  reset() {
    this.state = clone(defaultApartment);
    if (!this.state.shopping) this.state.shopping = [];
    if (!this.state.inspiration) this.state.inspiration = clone(defaultApartment.inspiration || []);
    this._emit(true);
  }

  exportJSON() {
    const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appart-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJSON(text) {
    const data = JSON.parse(text);
    if (!data.rooms || !data.furniture) throw new Error("Fichier invalide");
    this.state = data;
    if (!this.state.shopping) this.state.shopping = [];
    if (!this.state.inspiration) this.state.inspiration = [];
    this._emit(true);
  }
}

export const store = new Store();
