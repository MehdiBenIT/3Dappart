/*
 * ============================================================================
 *  CONFIGURATION DE L'APPARTEMENT  —  ⚠️  DIMENSIONS APPROXIMATIVES  ⚠️
 * ============================================================================
 *
 *  Layout fidèle aux croquis de Mehdi (T1 bis) MAIS les cotes sont estimées.
 *  Dès que les vraies mesures arrivent, on remplace simplement les chiffres.
 *
 *  Repère : tout est en MÈTRES.
 *    - x : gauche → droite            - z : haut (nord) → bas (sud)
 *    - y : hauteur (géré automatiquement)
 *
 *  Une pièce = rectangle défini par son coin haut-gauche (x, z),
 *  sa largeur (width, sur X) et sa profondeur (depth, sur Z).
 *
 *  Côtés pour ouvertures / radiateurs :
 *    'N' = mur du haut (nord, z min)   'S' = mur du bas (sud, z max)
 *    'W' = mur de gauche (x min)       'E' = mur de droite (x max)
 *  `offset` = distance depuis le coin gauche/haut du mur, le long du mur.
 *
 *  Plan général (vue de dessus, nord = haut = façade avec les fenêtres) :
 *
 *      ┌──────────┬────────────────────────┐
 *      │ CHAMBRE  │      SALLE DE VIE       │   ← fenêtres au nord
 *      │ (fenêtre)│  bureau · canapé · TV   │
 *      ├──────────┤       cuisine (SO)      │
 *      │  SdB     │                         │
 *      └──────────┴───────┬────────┬────────┘
 *                         │COULOIR │
 *                         │ entrée │
 *                         └────────┘
 * ============================================================================
 */

export const IS_PLACEHOLDER = true; // dimensions estimées, pas encore mesurées

export const apartment = {
  meta: {
    name: "Mon appartement (T1 bis)",
    unit: "m",
  },

  wallHeight: 2.5,
  wallThickness: 0.1,

  rooms: [
    // --- CHAMBRE (nord-ouest) ---
    {
      id: "chambre",
      name: "Chambre",
      x: 0, z: 0, width: 3.0, depth: 3.2,
      floorColor: "#f1dfe1",
      accentWalls: ["N", "W"],
      openings: [
        { type: "window", side: "N", offset: 1.0, width: 1.2, height: 1.4, sill: 0.9 },
        { type: "door", side: "E", offset: 0.4, width: 0.9, height: 2.1 }, // vers salle de vie
        { type: "door", side: "S", offset: 0.5, width: 0.8, height: 2.1 }, // vers salle de bain
      ],
      radiators: [{ side: "N", offset: 1.05, width: 1.0, height: 0.6 }],
    },

    // --- SALLE DE BAIN (sud-ouest, reliée à la chambre) ---
    {
      id: "sdb",
      name: "Salle de bain",
      x: 0, z: 3.2, width: 3.0, depth: 2.2,
      floorColor: "#ecdfe6",
      accentWalls: ["W"],
      openings: [
        { type: "door", side: "N", offset: 0.5, width: 0.8, height: 2.1 }, // depuis la chambre
      ],
      radiators: [],
    },

    // --- SALLE DE VIE (salon + cuisine ouverte, à l'est) ---
    {
      id: "sejour",
      name: "Salle de vie",
      x: 3.0, z: 0, width: 5.0, depth: 5.4,
      floorColor: "#f1dfe1",
      accentWalls: ["N", "E"],
      openings: [
        { type: "window", side: "N", offset: 1.5, width: 1.4, height: 1.4, sill: 0.9 },
        { type: "window", side: "N", offset: 3.3, width: 1.4, height: 1.4, sill: 0.9 },
        { type: "door", side: "W", offset: 0.4, width: 0.9, height: 2.1 },    // vers chambre
        { type: "opening", side: "S", offset: 2.75, width: 1.0, height: 2.1 }, // vers couloir
      ],
      radiators: [
        { side: "E", offset: 0.4, width: 1.0, height: 0.6 },
        { side: "W", offset: 2.2, width: 1.0, height: 0.6 },
      ],
    },

    // --- COULOIR / ENTRÉE (au sud) ---
    {
      id: "couloir",
      name: "Entrée / Couloir",
      x: 5.5, z: 5.4, width: 1.6, depth: 2.4,
      floorColor: "#eeddDF",
      accentWalls: ["E"],
      openings: [
        { type: "opening", side: "N", offset: 0.25, width: 1.0, height: 2.1 }, // vers salle de vie
        { type: "door", side: "S", offset: 0.4, width: 0.9, height: 2.1 },      // porte d'entrée
      ],
      radiators: [],
    },
  ],

  // Meubles — x,z = CENTRE au sol ; rotation en degrés ; dims en mètres (L×P×H).
  furniture: [
    // Chambre
    { id: "lit", name: "Lit double", type: "bed", room: "chambre",
      x: 1.5, z: 1.5, w: 1.4, d: 1.9, h: 0.5, rotation: 0, color: "#b98d5e" },
    { id: "commode", name: "Commode", type: "dresser", room: "chambre",
      x: 0.45, z: 2.7, w: 0.8, d: 0.45, h: 0.9, rotation: 90, color: "#9c7346" },
    { id: "chaise", name: "Chaise", type: "chair", room: "chambre",
      x: 2.6, z: 0.55, w: 0.45, d: 0.45, h: 0.9, rotation: 0, color: "#2b2b30" },

    // Salle de bain
    { id: "douche", name: "Douche", type: "shower", room: "sdb",
      x: 2.4, z: 4.9, w: 0.9, d: 0.9, h: 2.0, rotation: 0, color: "#cfe0e5" },
    { id: "wc", name: "Toilette", type: "toilet", room: "sdb",
      x: 1.4, z: 5.0, w: 0.4, d: 0.6, h: 0.8, rotation: 0, color: "#eceef0" },
    { id: "lavabo", name: "Lavabo", type: "sink", room: "sdb",
      x: 0.5, z: 3.7, w: 0.6, d: 0.45, h: 0.85, rotation: 0, color: "#e6e9ec" },

    // Salle de vie — coin salon
    { id: "canape", name: "Canapé", type: "sofa", room: "sejour",
      x: 4.3, z: 3.0, w: 2.0, d: 0.9, h: 0.8, rotation: 90, color: "#f2f0ee" },
    { id: "meuble-tv", name: "Meuble TV", type: "tv-unit", room: "sejour",
      x: 7.7, z: 3.0, w: 1.6, d: 0.4, h: 0.5, rotation: 90, color: "#1f1f22" },
    { id: "tv", name: "TV", type: "tv", room: "sejour",
      x: 7.9, z: 3.0, w: 1.1, d: 0.06, h: 0.65, rotation: 90, color: "#141416" },
    { id: "bureau", name: "Bureau", type: "desk", room: "sejour",
      x: 5.0, z: 0.45, w: 1.4, d: 0.6, h: 0.75, rotation: 0, color: "#b98d5e" },

    // Salle de vie — coin cuisine (sud-ouest)
    { id: "frigo", name: "Frigo", type: "fridge", room: "sejour",
      x: 3.4, z: 4.9, w: 0.6, d: 0.6, h: 1.8, rotation: 0, color: "#eef0f2" },
    { id: "plan-cuisine", name: "Plan cuisine", type: "counter", room: "sejour",
      x: 4.7, z: 5.0, w: 2.0, d: 0.6, h: 0.9, rotation: 0, color: "#b98d5e" },
    { id: "rangement", name: "Rangement", type: "storage", room: "sejour",
      x: 3.4, z: 3.5, w: 0.9, d: 0.6, h: 2.0, rotation: 90, color: "#c0392b" },

    // Déco salon
    { id: "tapis", name: "Tapis", type: "rug", room: "sejour",
      x: 5.0, z: 3.1, w: 1.9, d: 1.5, h: 0.02, rotation: 0, color: "#d9c7cf" },
    { id: "lampe", name: "Lampadaire", type: "lamp", room: "sejour",
      x: 6.6, z: 1.4, w: 0.34, d: 0.34, h: 1.55, rotation: 0, color: "#f3ece0" },
  ],

  // Idées / achats par pièce (synchronisables avec TickTick).
  // priority : "high" | "med" | "low"
  shopping: [
    // 🧺 Gestion du linge (lavé → séché → rangé)
    { id: "s1", room: "chambre", priority: "high", done: false,
      label: "Bac à linge propre pliable",
      note: "Remplace les sacs Ikea qui traînent : UN seul contenant dédié au linge propre en attente de pliage. Se plie quand il est vide." },
    { id: "s2", room: "chambre", priority: "med", done: false,
      label: "Valet de chambre (repose-vêtements)",
      note: "Pour poser les vêtements portés une fois / à plier, au lieu de les entasser sur le côté." },
    { id: "s3", room: "chambre", priority: "med", done: false,
      label: "Défroisseur vapeur à main",
      note: "Remplace fer + planche (encombrants) : défroisse directement sur cintre. Gain de place." },
    { id: "s4", room: "chambre", priority: "med", done: false,
      label: "Lit avec coffre de rangement",
      note: "Range couettes, linge de saison, valises → libère de la place ailleurs." },

    // 🚪 Salle de bain — espace mort derrière la porte
    { id: "s5", room: "sdb", priority: "high", done: false,
      label: "Patère / crochets derrière la porte",
      note: "Solution pas chère pour exploiter l'espace mort entre la porte ouverte et le mur (serviettes, peignoir)." },
    { id: "s6", room: "sdb", priority: "low", done: false,
      label: "Porte coulissante ou pliante (à étudier)",
      note: "Projet plus tard : supprime le débattement de la porte et libère le passage à l'entrée de la SdB." },
    { id: "s7", room: "sdb", priority: "med", done: false,
      label: "Étagère d'angle fine",
      note: "Rangement vertical pour produits, sans empiéter sur le passage." },

    // 🛋️ Salle de vie — rangement vertical
    { id: "s8", room: "sejour", priority: "med", done: false,
      label: "Étagères murales au-dessus du bureau",
      note: "Range en hauteur, libère le plan de travail et le sol." },
    { id: "s9", room: "sejour", priority: "low", done: false,
      label: "Paniers / boîtes déco de rangement",
      note: "Cachent le bazar tout en restant dans le style épuré." },

    // 🚪 Entrée / couloir
    { id: "s10", room: "couloir", priority: "high", done: false,
      label: "Patères murales (manteaux)",
      note: "Pas cher, gain immédiat : plus de manteaux qui traînent." },
    { id: "s11", room: "couloir", priority: "med", done: false,
      label: "Meuble d'entrée compact (banc + chaussures)",
      note: "Range les chaussures et sert d'assise pour se chausser." },
    { id: "s12", room: "couloir", priority: "low", done: false,
      label: "Miroir d'entrée",
      note: "Agrandit visuellement le couloir et pratique avant de sortir." },
  ],

  // Inspirations (modifiables dans l'onglet Inspiration).
  // category : "Ambiance" | "Gain de place" | "Déco"
  inspiration: [
    { id: "i1", category: "Ambiance", title: "Japandi épuré",
      note: "Bois clair, blanc cassé, lignes nettes, quelques touches noires. Chaleureux mais minimaliste.",
      palette: ["#e9ddc9", "#f4f2ee", "#b98d5e", "#2b2b2e"] },
    { id: "i2", category: "Ambiance", title: "Cosy nuit (prune & rose)",
      note: "Ambiance douce et feutrée : murs lavande, touches rose poudré, lin et bois. (Ton style de réf.)",
      palette: ["#e7e1f2", "#e0568a", "#f0dee0", "#2b2340"] },
    { id: "i3", category: "Gain de place", title: "Lit-coffre + boîtes sous-lit",
      note: "Toute la place perdue sous le lit devient du rangement pour couettes, valises, linge de saison.",
      palette: [] },
    { id: "i4", category: "Gain de place", title: "Mur d'étagères au-dessus du bureau",
      note: "On range en hauteur : le plan de travail reste dégagé et le sol respire.",
      palette: [] },
    { id: "i5", category: "Déco", title: "Coin lecture + lampe chaude",
      note: "Un fauteuil compact, une lampe à lumière chaude et une plante : le salon devient accueillant sans encombrer.",
      palette: ["#f2f0ee", "#8b9ca7", "#6f8f6a"] },
    { id: "i6", category: "Déco", title: "Entrée fonctionnelle",
      note: "Banc + patères + miroir : tout se pose et s'accroche en rentrant, fini le bazar dans le couloir.",
      palette: [] },
  ],
};
