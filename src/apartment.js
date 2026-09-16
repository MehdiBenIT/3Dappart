/*
 * ============================================================================
 *  CONFIGURATION DE L'APPARTEMENT  —  ⚠️  DONNÉES PLACEHOLDER  ⚠️
 * ============================================================================
 *
 *  Tout ce qui est ici est INVENTÉ pour que l'app tourne tout de suite.
 *  Dès que Mehdi donne ses vraies mesures, on remplace les chiffres.
 *
 *  Repère : tout est en MÈTRES.
 *    - x : gauche → droite
 *    - z : haut → bas du plan (vers l'observateur)
 *    - y : hauteur (géré automatiquement)
 *
 *  Une pièce est un rectangle défini par son coin haut-gauche (x, z),
 *  sa largeur (width, sur X) et sa profondeur (depth, sur Z).
 *
 *  Les ouvertures (portes / fenêtres) et radiateurs se placent sur un CÔTÉ :
 *    - 'N' = mur du haut   (z minimum)
 *    - 'S' = mur du bas    (z maximum)
 *    - 'W' = mur de gauche (x minimum)
 *    - 'E' = mur de droite (x maximum)
 *  `offset` = distance depuis le coin gauche/haut du mur, le long du mur.
 * ============================================================================
 */

export const IS_PLACEHOLDER = true;

export const apartment = {
  meta: {
    name: "Mon appartement (exemple)",
    unit: "m",
  },

  // Hauteur sous plafond et épaisseur des murs (valeurs par défaut françaises).
  wallHeight: 2.5,
  wallThickness: 0.1,

  rooms: [
    {
      id: "sejour",
      name: "Séjour",
      x: 0, z: 0, width: 4.5, depth: 4.0,
      floorColor: "#d9c7a3",
      openings: [
        { type: "window", side: "N", offset: 1.0, width: 1.6, height: 1.4, sill: 0.9 },
        { type: "door", side: "S", offset: 1.5, width: 0.9, height: 2.1 }, // vers couloir
      ],
      radiators: [{ side: "N", offset: 1.1, width: 1.0, height: 0.6 }],
    },
    {
      id: "cuisine",
      name: "Cuisine",
      x: 4.5, z: 0, width: 2.5, depth: 4.0,
      floorColor: "#cfd6d3",
      openings: [
        { type: "window", side: "N", offset: 0.7, width: 1.0, height: 1.2, sill: 1.0 },
        { type: "opening", side: "W", offset: 1.4, width: 1.2, height: 2.1 }, // ouvert sur séjour
      ],
      radiators: [{ side: "E", offset: 1.5, width: 0.8, height: 0.6 }],
    },
    {
      id: "couloir",
      name: "Entrée / Couloir",
      x: 0, z: 4.0, width: 2.0, depth: 3.0,
      floorColor: "#c9bfae",
      openings: [
        { type: "door", side: "S", offset: 0.5, width: 0.9, height: 2.1 }, // porte d'entrée
        { type: "door", side: "E", offset: 0.8, width: 0.9, height: 2.1 }, // vers chambre
      ],
      radiators: [],
    },
    {
      id: "chambre",
      name: "Chambre",
      x: 2.0, z: 4.0, width: 3.0, depth: 3.0,
      floorColor: "#c8b6d6",
      openings: [
        { type: "window", side: "S", offset: 1.0, width: 1.4, height: 1.4, sill: 0.9 },
      ],
      radiators: [{ side: "S", offset: 1.1, width: 1.0, height: 0.6 }],
    },
    {
      id: "sdb",
      name: "Salle de bain",
      x: 5.0, z: 4.0, width: 2.0, depth: 3.0,
      floorColor: "#bcd3dd",
      openings: [
        { type: "door", side: "W", offset: 1.0, width: 0.8, height: 2.1 },
        { type: "window", side: "E", offset: 1.0, width: 0.6, height: 0.8, sill: 1.4 },
      ],
      radiators: [],
    },
  ],

  // Meubles — dimensions en mètres : w (largeur X), d (profondeur Z), h (hauteur Y).
  // x,z = CENTRE du meuble au sol ; rotation en degrés autour de la verticale.
  furniture: [
    { id: "lit", name: "Lit double", type: "bed", room: "chambre",
      x: 2.8, z: 5.0, w: 1.4, d: 1.9, h: 0.5, rotation: 0, color: "#8d6e63" },
    { id: "commode", name: "Commode", type: "dresser", room: "chambre",
      x: 4.5, z: 4.4, w: 0.8, d: 0.45, h: 0.9, rotation: 0, color: "#6d4c41" },
    { id: "canape", name: "Canapé", type: "sofa", room: "sejour",
      x: 1.2, z: 3.4, w: 2.0, d: 0.9, h: 0.8, rotation: 0, color: "#546e7a" },
    { id: "table", name: "Table", type: "table", room: "sejour",
      x: 3.0, z: 1.6, w: 1.2, d: 0.8, h: 0.75, rotation: 0, color: "#795548" },
  ],

  // Idées / choses à acheter par pièce (synchronisables avec TickTick).
  shopping: [
    { id: "s1", room: "chambre", label: "Tête de lit", note: "", done: false },
    { id: "s2", room: "sejour", label: "Bibliothèque murale", note: "", done: false },
  ],
};
