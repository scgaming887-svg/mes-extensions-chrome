# Mes extensions Chrome

Trois extensions Manifest V3, indépendantes les unes des autres.

| Dossier | Nom | Ce que ça fait |
|---|---|---|
| `GameOpen/` | GameOpen | Lance Roblox, Discord, Steam… depuis le navigateur + 2 mini-jeux |
| `PageCustomer/` | PageCustomer | Change l'apparence de n'importe quel site (thème, police, couleurs, CSS) |
| `PetPage/` | PetPage | Un petit animal qui se promène sur tes pages |

## Installation (30 secondes, à faire pour chaque extension)

1. Ouvre Chrome (ou Edge / Brave / Opera) sur `chrome://extensions`
2. Active **Mode développeur** en haut à droite
3. Clique **Charger l'extension non empaquetée**
4. Sélectionne le dossier (`GameOpen`, puis `PageCustomer`, puis `PetPage`)
5. Épingle-les avec l'icône puzzle 🧩 de la barre d'outils

Après une modification du code : reviens sur `chrome://extensions` et clique la
flèche ↻ de l'extension. Pour PageCustomer et PetPage, recharge aussi l'onglet.

## Notes

- Aucune icône n'est fournie : Chrome affiche l'initiale du nom. Pour en ajouter,
  dépose `icon16/48/128.png` dans le dossier et ajoute la clé `"icons"` au manifest.
- Aucune donnée ne sort de ton navigateur : tout est dans `chrome.storage.local`.
- GameOpen ne peut lancer une app que si elle est **installée** sur le PC : le
  navigateur affiche une boîte « Ouvrir Discord ? » qu'il faut accepter.

## Interactions PetPage

| Geste sur l'animal | Effet |
|---|---|
| 1 clic | caresse + petit saut, cœurs qui montent |
| 2 clics | une gamelle tombe du ciel, il court la manger |
| Cliquer-glisser | on l'attrape, on le lance, il retombe avec la gravité |
| Boutons du popup | « Nourrir » et « Sauter » à distance |

La nourriture s'adapte à l'animal : poisson pour le chat, os pour le chien,
carotte pour le lapin, bambou pour le panda…
