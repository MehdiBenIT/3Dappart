import { store } from "./store.js";

/*
 * Panneau latéral : onglets Pièces / Meubles / À acheter.
 * Se re-rend à chaque changement du store.
 */

const el = (sel) => document.querySelector(sel);
const uid = () => Math.random().toString(36).slice(2, 8);

function roomName(id) {
  const r = store.get().rooms.find((x) => x.id === id);
  return r ? r.name : "—";
}

export function initUI({ onSelectFurniture, onFocusRoom } = {}) {
  // Onglets.
  document.querySelectorAll("#panel .tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#panel .tabs button").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll("#panel [data-panel]").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      el(`[data-panel="${btn.dataset.tab}"]`).classList.add("active");
    });
  });

  function renderRooms() {
    const s = store.get();
    const host = el('[data-panel="rooms"]');
    host.innerHTML = "";
    s.rooms.forEach((r) => {
      const area = (r.width * r.depth).toFixed(1);
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-head">
          <strong>${r.name}</strong>
          <span class="badge">${area} m²</span>
        </div>
        <div class="muted">${r.width.toFixed(2)} × ${r.depth.toFixed(2)} m
          · ${(r.openings || []).filter((o) => o.type === "window").length} fenêtre(s)
          · ${(r.radiators || []).length} radiateur(s)</div>
        <button class="link focus-room" data-id="${r.id}">Centrer la vue ▸</button>`;
      card.querySelector(".focus-room").addEventListener("click", () => onFocusRoom?.(r.id));
      host.appendChild(card);
    });
    const total = s.rooms.reduce((a, r) => a + r.width * r.depth, 0);
    const foot = document.createElement("p");
    foot.className = "muted total";
    foot.textContent = `Surface totale : ${total.toFixed(1)} m²`;
    host.appendChild(foot);
  }

  function furnitureRow(f) {
    const row = document.createElement("div");
    row.className = "card furn";
    row.innerHTML = `
      <div class="card-head">
        <span class="swatch" style="background:${f.color}"></span>
        <strong class="grow">${f.name}</strong>
        <button class="icon rot" title="Pivoter 90°">⟳</button>
        <button class="icon del" title="Supprimer">✕</button>
      </div>
      <div class="dims">
        <label>L<input type="number" step="0.05" value="${f.w}" data-k="w"></label>
        <label>P<input type="number" step="0.05" value="${f.d}" data-k="d"></label>
        <label>H<input type="number" step="0.05" value="${f.h}" data-k="h"></label>
      </div>
      <div class="muted">${roomName(f.room)}</div>`;
    row.querySelector(".rot").addEventListener("click", () =>
      store.updateFurniture(f.id, { rotation: ((f.rotation || 0) + 90) % 360 }, true)
    );
    row.querySelector(".del").addEventListener("click", () => {
      if (confirm(`Supprimer « ${f.name} » ?`)) store.removeFurniture(f.id);
    });
    row.querySelectorAll(".dims input").forEach((inp) => {
      inp.addEventListener("change", () => {
        const v = parseFloat(inp.value);
        if (v > 0) store.updateFurniture(f.id, { [inp.dataset.k]: v }, true);
      });
    });
    row.querySelector("strong").addEventListener("click", () => onSelectFurniture?.(f.id));
    return row;
  }

  function renderFurniture() {
    const s = store.get();
    const host = el('[data-panel="furniture"]');
    host.innerHTML = "";
    s.furniture.forEach((f) => host.appendChild(furnitureRow(f)));

    // Formulaire d'ajout.
    const add = document.createElement("div");
    add.className = "add-form";
    add.innerHTML = `
      <h4>Ajouter un meuble</h4>
      <input id="nf-name" placeholder="Nom (ex : Armoire)">
      <div class="dims">
        <label>L<input id="nf-w" type="number" step="0.05" value="1.0"></label>
        <label>P<input id="nf-d" type="number" step="0.05" value="0.5"></label>
        <label>H<input id="nf-h" type="number" step="0.05" value="1.0"></label>
      </div>
      <select id="nf-room">${s.rooms.map((r) => `<option value="${r.id}">${r.name}</option>`).join("")}</select>
      <input id="nf-color" type="color" value="#8d6e63">
      <button id="nf-add" class="primary">+ Ajouter</button>`;
    host.appendChild(add);
    add.querySelector("#nf-add").addEventListener("click", () => {
      const name = el("#nf-name").value.trim() || "Meuble";
      const room = el("#nf-room").value;
      const r = s.rooms.find((x) => x.id === room);
      store.addFurniture({
        id: "f" + uid(),
        name, type: "custom", room,
        x: r.x + r.width / 2, z: r.z + r.depth / 2,
        w: parseFloat(el("#nf-w").value) || 1,
        d: parseFloat(el("#nf-d").value) || 0.5,
        h: parseFloat(el("#nf-h").value) || 1,
        rotation: 0, color: el("#nf-color").value,
      });
    });
  }

  function renderShopping() {
    const s = store.get();
    const host = el('[data-panel="shopping"]');
    host.innerHTML = "";
    const prioRank = { high: 0, med: 1, low: 2 };
    const prioDot = { high: "🔴", med: "🟠", low: "🟡" };

    s.rooms.forEach((r) => {
      const items = s.shopping
        .filter((x) => x.room === r.id)
        .sort((a, b) => (prioRank[a.priority] ?? 3) - (prioRank[b.priority] ?? 3));
      if (!items.length) return;
      const block = document.createElement("div");
      block.className = "shop-block";
      block.innerHTML = `<h4>${r.name}</h4>`;
      items.forEach((it) => {
        const line = document.createElement("div");
        line.className = "shop-item" + (it.done ? " done" : "");
        line.innerHTML = `
          <input type="checkbox" ${it.done ? "checked" : ""}>
          <span class="dot" title="Priorité">${prioDot[it.priority] || "⚪️"}</span>
          <div class="grow">
            <div class="lbl">${it.label}</div>
            ${it.note ? `<div class="note">${it.note}</div>` : ""}
          </div>
          <button class="icon del" title="Supprimer">✕</button>`;
        line.querySelector("input").addEventListener("change", (e) =>
          store.updateShopping(it.id, { done: e.target.checked })
        );
        line.querySelector(".del").addEventListener("click", () => store.removeShopping(it.id));
        block.appendChild(line);
      });
      host.appendChild(block);
    });

    const done = s.shopping.filter((x) => x.done).length;
    const tally = document.createElement("p");
    tally.className = "muted";
    tally.textContent = `${s.shopping.length} idées · ${done} acheté(s)`;
    host.appendChild(tally);

    const add = document.createElement("div");
    add.className = "add-form";
    add.innerHTML = `
      <h4>Ajouter une idée / un achat</h4>
      <select id="ns-room">${s.rooms.map((r) => `<option value="${r.id}">${r.name}</option>`).join("")}</select>
      <input id="ns-label" placeholder="Ex : Étagère murale, lampe...">
      <select id="ns-prio">
        <option value="high">🔴 Priorité haute</option>
        <option value="med" selected>🟠 Priorité moyenne</option>
        <option value="low">🟡 Priorité basse</option>
      </select>
      <button id="ns-add" class="primary">+ Ajouter</button>
      <button id="ns-copy">📋 Copier la liste (TickTick)</button>
      <p class="muted">💡 Dis à Claude « synchronise avec TickTick » pour tout envoyer d'un coup.</p>`;
    host.appendChild(add);
    add.querySelector("#ns-add").addEventListener("click", () => {
      const label = el("#ns-label").value.trim();
      if (!label) return;
      store.addShopping({ id: "s" + uid(), room: el("#ns-room").value, label,
        priority: el("#ns-prio").value, note: "", done: false });
    });
    add.querySelector("#ns-copy").addEventListener("click", () => {
      const lines = [];
      s.rooms.forEach((r) => {
        const items = s.shopping.filter((x) => x.room === r.id);
        if (!items.length) return;
        lines.push(`# ${r.name}`);
        items.forEach((it) => lines.push(`- [${it.done ? "x" : " "}] ${it.label}${it.note ? " — " + it.note : ""}`));
        lines.push("");
      });
      navigator.clipboard?.writeText(lines.join("\n")).then(
        () => { const b = add.querySelector("#ns-copy"); b.textContent = "✅ Copié !"; setTimeout(() => b.textContent = "📋 Copier la liste (TickTick)", 1500); },
        () => alert("Copie impossible sur ce navigateur.")
      );
    });
  }

  function refresh() {
    renderRooms();
    renderFurniture();
    // La liste "À acheter" vit désormais sur la page Optimisation (pages.js).
  }

  refresh();
  return { refresh };
}
