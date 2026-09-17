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
      floorColor: "#e7dcc7",
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
      floorColor: "#ecedef",
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
      floorColor: "#e7dcc7",
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
      floorColor: "#e4dac6",
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
      x: 1.5, z: 1.5, w: 1.4, d: 1.9, h: 0.5, rotation: 0, color: "#b5895b" },
    { id: "commode", name: "Commode", type: "dresser", room: "chambre",
      x: 0.45, z: 2.7, w: 0.8, d: 0.45, h: 0.9, rotation: 90, color: "#7a5c3c" },
    { id: "chaise", name: "Chaise", type: "chair", room: "chambre",
      x: 2.6, z: 0.55, w: 0.45, d: 0.45, h: 0.9, rotation: 0, color: "#63666d" },

    // Salle de bain
    { id: "douche", name: "Douche", type: "shower", room: "sdb",
      x: 2.4, z: 4.9, w: 0.9, d: 0.9, h: 2.0, rotation: 0, color: "#cfe0e5" },
    { id: "wc", name: "Toilette", type: "toilet", room: "sdb",
      x: 1.4, z: 5.0, w: 0.4, d: 0.6, h: 0.8, rotation: 0, color: "#eceef0" },
    { id: "lavabo", name: "Lavabo", type: "sink", room: "sdb",
      x: 0.5, z: 3.7, w: 0.6, d: 0.45, h: 0.85, rotation: 0, color: "#e6e9ec" },

    // Salle de vie — coin salon
    { id: "canape", name: "Canapé", type: "sofa", room: "sejour",
      x: 4.3, z: 3.0, w: 2.0, d: 0.9, h: 0.8, rotation: 90, color: "#8b9ca7" },
    { id: "meuble-tv", name: "Meuble TV", type: "tv-unit", room: "sejour",
      x: 7.7, z: 3.0, w: 1.6, d: 0.4, h: 0.5, rotation: 90, color: "#2b2b2e" },
    { id: "tv", name: "TV", type: "tv", room: "sejour",
      x: 7.9, z: 3.0, w: 1.1, d: 0.06, h: 0.65, rotation: 90, color: "#161618" },
    { id: "bureau", name: "Bureau", type: "desk", room: "sejour",
      x: 5.0, z: 0.45, w: 1.4, d: 0.6, h: 0.75, rotation: 0, color: "#b5895b" },

    // Salle de vie — coin cuisine (sud-ouest)
    { id: "frigo", name: "Frigo", type: "fridge", room: "sejour",
      x: 3.4, z: 4.9, w: 0.6, d: 0.6, h: 1.8, rotation: 0, color: "#c9ccd1" },
    { id: "plan-cuisine", name: "Plan cuisine", type: "counter", room: "sejour",
      x: 4.7, z: 5.0, w: 2.0, d: 0.6, h: 0.9, rotation: 0, color: "#a9865c" },
    { id: "rangement", name: "Rangement", type: "storage", room: "sejour",
      x: 3.4, z: 3.5, w: 0.9, d: 0.6, h: 2.0, rotation: 90, color: "#8a6a44" },
  ],

  // Idées / achats par pièce (synchronisables avec TickTick).
  shopping: [
    { id: "s1", room: "sejour", label: "Étagères murales (gain de place)", note: "", done: false },
    { id: "s2", room: "chambre", label: "Tête de lit avec rangement", note: "", done: false },
    { id: "s3", room: "couloir", label: "Meuble d'entrée compact + miroir", note: "", done: false },
  ],
};
