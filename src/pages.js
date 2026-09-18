import { store } from "./store.js";

/*
 * Pages secondaires du site :
 *   - #page-optim  : diagnostic (problèmes → solutions) + liste d'achats priorisée
 *   - #page-inspiration : idées d'ambiance / gain de place / déco (éditables)
 */

const uid = () => Math.random().toString(36).slice(2, 8);
const prioRank = { high: 0, med: 1, low: 2 };
const prioDot = { high: "🔴", med: "🟠", low: "🟡" };
const prioLabel = { high: "Priorité haute", med: "Priorité moyenne", low: "Priorité basse" };

// Diagnostic : problèmes récurrents → solutions (contenu éditorial, statique).
const DIAGNOSTICS = [
  {
    icon: "🧺", title: "Le linge propre s'accumule",
    problem: "Pas de point de chute défini pour le linge sec : il finit dans des sacs Ikea qui traînent des jours dans la chambre.",
    solution: "Un seul bac à linge propre dédié (règle : bac plein = à plier le soir), un défroisseur vapeur à la place du fer + planche, et un valet pour les vêtements portés une fois.",
    buys: ["Bac à linge pliable", "Défroisseur vapeur à main", "Valet de chambre"],
  },
  {
    icon: "🚪", title: "Espace mort derrière la porte de la SdB",
    problem: "Le petit espace entre la porte ouverte et le mur est perdu, et la porte gêne le passage.",
    solution: "À court terme : patères/crochets derrière la porte + étagère d'angle fine. Plus tard : passer à une porte coulissante/pliante pour supprimer le débattement.",
    buys: ["Patère derrière la porte", "Étagère d'angle fine", "Porte coulissante (projet)"],
  },
  {
    icon: "📦", title: "Manque de rangement / bazar visible",
    problem: "Peu de rangement fermé : les objets s'étalent sur le sol et les surfaces.",
    solution: "Ranger en hauteur (étagères murales), exploiter le dessous du lit (lit-coffre + boîtes), et cacher le désordre dans des paniers déco.",
    buys: ["Étagères murales", "Lit-coffre", "Paniers de rangement"],
  },
  {
    icon: "🧥", title: "Entrée encombrée",
    problem: "Manteaux et chaussures s'entassent en arrivant, faute de rangement dédié.",
    solution: "Un meuble d'entrée compact (banc + chaussures), des patères murales et un miroir qui agrandit l'espace.",
    buys: ["Patères murales", "Meuble d'entrée (banc)", "Miroir d'entrée"],
  },
];

function roomName(id) {
  const r = store.get().rooms.find((x) => x.id === id);
  return r ? r.name : id;
}

function shoppingMarkdown() {
  const s = store.get();
  const lines = ["# 🏠 Aménagement appart"];
  s.rooms.forEach((r) => {
    const items = s.shopping.filter((x) => x.room === r.id);
    if (!items.length) return;
    lines.push("", `## ${r.name}`);
    items.forEach((it) => lines.push(`- [${it.done ? "x" : " "}] ${it.label}${it.note ? " — " + it.note : ""}`));
  });
  return lines.join("\n");
}

/* ------------------------------- Optimisation ------------------------------ */
function renderOptim() {
  const s = store.get();
  const host = document.getElementById("page-optim");
  if (!host) return;
  const total = s.shopping.length;
  const done = s.shopping.filter((x) => x.done).length;

  host.innerHTML = `
    <div class="page-inner">
      <header class="page-head">
        <h1>🧩 Optimisation &amp; Achats</h1>
        <p class="lead">Tes galères du quotidien transformées en solutions concrètes, et la liste d'achats
        priorisée pour un appart mieux organisé.</p>
      </header>

      <section class="diag-grid">
        ${DIAGNOSTICS.map((d) => `
          <article class="diag-card">
            <div class="diag-ico">${d.icon}</div>
            <h3>${d.title}</h3>
            <p class="prob"><b>Problème —</b> ${d.problem}</p>
            <p class="sol"><b>Solution —</b> ${d.solution}</p>
            <div class="chips">${d.buys.map((b) => `<span class="chip">${b}</span>`).join("")}</div>
          </article>`).join("")}
      </section>

      <section class="shop">
        <div class="shop-head">
          <h2>🛒 Liste d'achats</h2>
          <div class="shop-actions">
            <span class="tally">${done}/${total} acheté(s)</span>
            <button id="op-copy" class="btn">📋 Copier</button>
          </div>
        </div>
        <div id="op-shop-list"></div>

        <div class="add-form wide">
          <h4>Ajouter un achat</h4>
          <div class="row">
            <select id="op-room">${s.rooms.map((r) => `<option value="${r.id}">${r.name}</option>`).join("")}</select>
            <select id="op-prio">
              <option value="high">🔴 Haute</option>
              <option value="med" selected>🟠 Moyenne</option>
              <option value="low">🟡 Basse</option>
            </select>
          </div>
          <input id="op-label" placeholder="Ex : Étagère murale, panier à linge...">
          <input id="op-note" placeholder="Note (optionnel : à quoi ça sert)">
          <button id="op-add" class="primary">+ Ajouter</button>
          <p class="muted">💡 Dis à Claude « synchronise avec TickTick » pour tout envoyer d'un coup.</p>
        </div>
      </section>
    </div>`;

  // Liste groupée par pièce.
  const list = host.querySelector("#op-shop-list");
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
        <span class="dot" title="${prioLabel[it.priority] || ""}">${prioDot[it.priority] || "⚪️"}</span>
        <div class="grow">
          <div class="lbl">${it.label}</div>
          ${it.note ? `<div class="note">${it.note}</div>` : ""}
        </div>
        <button class="icon del" title="Supprimer">✕</button>`;
      line.querySelector("input").addEventListener("change", (e) => store.updateShopping(it.id, { done: e.target.checked }));
      line.querySelector(".del").addEventListener("click", () => store.removeShopping(it.id));
      block.appendChild(line);
    });
    list.appendChild(block);
  });

  host.querySelector("#op-add").addEventListener("click", () => {
    const label = host.querySelector("#op-label").value.trim();
    if (!label) return;
    store.addShopping({
      id: "s" + uid(), room: host.querySelector("#op-room").value,
      priority: host.querySelector("#op-prio").value,
      label, note: host.querySelector("#op-note").value.trim(), done: false,
    });
  });
  host.querySelector("#op-copy").addEventListener("click", (e) => {
    navigator.clipboard?.writeText(shoppingMarkdown()).then(() => {
      e.target.textContent = "✅ Copié !";
      setTimeout(() => (e.target.textContent = "📋 Copier"), 1500);
    });
  });
}

/* -------------------------------- Inspiration ------------------------------ */
function renderInspiration() {
  const s = store.get();
  const host = document.getElementById("page-inspiration");
  if (!host) return;
  const cats = ["Ambiance", "Gain de place", "Déco"];
  const items = s.inspiration || [];

  const card = (it) => `
    <article class="insp-card">
      ${it.palette && it.palette.length ? `<div class="swatches">${it.palette.map((c) => `<span style="background:${c}"></span>`).join("")}</div>` : `<div class="swatches empty">💡</div>`}
      <div class="insp-body">
        <div class="insp-top"><h3>${it.title}</h3><button class="icon del" data-id="${it.id}" title="Supprimer">✕</button></div>
        <p>${it.note || ""}</p>
        ${it.link ? `<a href="${it.link}" target="_blank" rel="noopener" class="insp-link">Voir ↗</a>` : ""}
      </div>
    </article>`;

  host.innerHTML = `
    <div class="page-inner">
      <header class="page-head">
        <h1>✨ Inspiration</h1>
        <p class="lead">Des directions d'ambiance et des idées gain de place pour ton T1 bis.
        Ajoute les tiennes (avec un lien Pinterest/photo si tu veux).</p>
      </header>
      ${cats.map((cat) => {
        const group = items.filter((i) => i.category === cat);
        if (!group.length) return "";
        return `<section class="insp-section"><h2>${cat}</h2>
          <div class="insp-grid">${group.map(card).join("")}</div></section>`;
      }).join("")}

      <section class="add-form wide">
        <h4>Ajouter une inspiration</h4>
        <div class="row">
          <input id="in-title" placeholder="Titre (ex : Étagère cannage)">
          <select id="in-cat">${cats.map((c) => `<option value="${c}">${c}</option>`).join("")}</select>
        </div>
        <input id="in-note" placeholder="Note / description">
        <input id="in-link" placeholder="Lien (optionnel)">
        <button id="in-add" class="primary">+ Ajouter</button>
      </section>
    </div>`;

  host.querySelectorAll(".insp-card .del").forEach((b) =>
    b.addEventListener("click", () => store.removeInspiration(b.dataset.id)));
  host.querySelector("#in-add").addEventListener("click", () => {
    const title = host.querySelector("#in-title").value.trim();
    if (!title) return;
    store.addInspiration({
      id: "i" + uid(), title, category: host.querySelector("#in-cat").value,
      note: host.querySelector("#in-note").value.trim(),
      link: host.querySelector("#in-link").value.trim(), palette: [],
    });
  });
}

export function initPages() {
  function refresh() {
    renderOptim();
    renderInspiration();
  }
  refresh();
  store.addEventListener("change", refresh);
  return { refresh };
}
