# 🏠 Appart 3D — Visualiseur d'aménagement

Application web locale pour visualiser mon appartement en 3D et tester
différents aménagements (meubles, achats à prévoir), en vue de mieux
l'organiser.

Construit avec **[Three.js](https://threejs.org/)** + **[Vite](https://vitejs.dev/)**.

## Lancer en local

```bash
npm install      # une seule fois
npm run dev      # démarre le serveur de dev (http://localhost:5173)
```

Puis ouvrir l'URL affichée dans le navigateur.

Pour une version "production" :

```bash
npm run build    # génère dist/
npm run preview  # sert dist/ en local
```

## Utilisation

- **3D / Plan** : basculer entre la vue perspective et la vue plan du dessus
  (idéale pour positionner les meubles au centimètre).
- **Clic-glisser** un meuble pour le déplacer (aimanté à une grille de 5 cm).
- **Plafonds / Grille / Noms** : afficher ou masquer ces éléments.
- **Panneau de droite** :
  - *Pièces* : dimensions et surfaces, bouton « Centrer la vue ».
  - *Meubles* : modifier les dimensions (L × P × H), pivoter, supprimer, ajouter.
  - *À acheter* : idées / achats à prévoir par pièce (synchronisables avec TickTick).
- **Export / Import** : sauvegarder ou recharger toute la configuration en JSON.
  (Une sauvegarde automatique est aussi faite dans le navigateur.)

## Adapter à mon vrai appartement

Toutes les dimensions vivent dans **`src/apartment.js`**. Les valeurs
actuelles sont un **exemple fictif** (bandeau orange dans l'app). Il suffit de
remplacer les chiffres par les vraies mesures — voir la checklist ci-dessous.

## 📏 Checklist des mesures à prendre

Tout en **centimètres ou mètres**, à plat au sol. Pour chaque pièce :

1. **Dimensions au sol** : longueur × largeur (largeur des murs).
2. **Hauteur sous plafond**.
3. **Fenêtres** : pour chacune → sur quel mur, largeur, hauteur, hauteur du bas
   de la fenêtre par rapport au sol (allège), et distance depuis le coin du mur.
4. **Portes** : sur quel mur, largeur, et distance depuis le coin.
5. **Radiateurs** : sur quel mur, largeur, hauteur, distance depuis le coin.
6. **Éléments fixes** : placards encastrés, cheminée, colonnes, etc.

Pour les **meubles** (ceux à garder / déplacer) :
- Nom, largeur × profondeur × hauteur, et pièce actuelle.

👉 Le plus simple : un petit croquis de chaque pièce avec les cotes, ou une
liste. Donne-les à Claude et il met à jour `src/apartment.js`.

## Structure

```
src/
  apartment.js   # ← LES DONNÉES : pièces, murs, ouvertures, meubles
  builder.js     # construit la coque 3D (sols, murs, fenêtres, radiateurs)
  furniture.js   # meubles (boîtes + étiquettes)
  store.js       # état + sauvegarde locale + import/export JSON
  ui.js          # panneau latéral
  main.js        # scène, caméras, contrôles, déplacement des meubles
  styles.css
```
