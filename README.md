<div align="center">

# Mes extensions Chrome

**GameOpen** · **PageCustomer** · **PetPage**

Trois extensions Chrome faites maison, gratuites, sans publicité et sans collecte de données.

### 👉 [**Page de téléchargement**](https://scgaming887-svg.github.io/mes-extensions-chrome/) 👈

</div>

---

## Les trois extensions

<table>
<tr>
<td width="80"><img src="GameOpen/icons/icon128.png" width="64"></td>
<td>

### GameOpen
Lance tes applications de bureau depuis le navigateur, et joue en attendant.

- 9 raccourcis prêts : Roblox, Discord, Steam, Spotify, Epic, Minecraft, Twitch, VS Code, YouTube
- Clic gauche : ouvre l'application installée · Clic droit : ouvre la version web
- Ajoute tes propres raccourcis (nom, emoji, protocole, site)
- Deux mini-jeux intégrés : **Snake** et **Casse-brique**, avec records sauvegardés

</td>
</tr>
<tr>
<td><img src="PageCustomer/icons/icon128.png" width="64"></td>
<td>

### PageCustomer
Change l'apparence de n'importe quel site.

- 6 thèmes en un clic : Nuit, Sépia, Néon, Lecture, Pastel
- Réglages express : mode sombre, gros texte, colonne de lecture, sans images, sans animations
- Couleurs, police, zoom, interligne, largeur de lecture, coins arrondis
- Filtres luminosité / contraste / saturation, et une zone de CSS personnalisé
- Réglages **par site** ou **pour tous les sites**

</td>
</tr>
<tr>
<td><img src="PetPage/icons/icon128.png" width="64"></td>
<td>

### PetPage
Un compagnon animé qui vit en bas de tes pages.

- 18 animaux au choix, taille, vitesse et nom réglables
- Il marche, s'ennuie, s'endort, saute tout seul et te suit à la souris
- Nourriture adaptée à l'espèce : poisson pour le chat, os pour le chien, carotte pour le lapin…
- Physique réelle : attrape-le, lance-le, il retombe et s'écrase au sol
- Désactivable site par site

</td>
</tr>
</table>

---

## Installation

Le plus simple : va sur la **[page de téléchargement](https://scgaming887-svg.github.io/mes-extensions-chrome/)**, prends le `.zip` qui t'intéresse, puis :

1. **Décompresse-le** — clic droit → *Extraire tout*. Chrome ne lit pas les archives, il lui faut un dossier. Garde-le à un endroit fixe.
2. Ouvre **`chrome://extensions`** *(ou `edge://extensions` sur Edge)*
3. Active le **Mode développeur**, en haut à droite
4. Clique **Charger l'extension non empaquetée** et choisis le dossier extrait

> **À savoir** : Chrome affiche un bandeau « Désactiver les extensions en mode développeur » à chaque démarrage. C'est normal hors du Web Store, tu peux le fermer. Et si tu déplaces ou supprimes le dossier, l'extension cesse de fonctionner.

### Depuis le dépôt (pour développer)

```bash
git clone https://github.com/scgaming887-svg/mes-extensions-chrome.git
```

Puis charge directement les dossiers `GameOpen/`, `PageCustomer/` ou `PetPage/`.
Après chaque modification : bouton ↻ sur `chrome://extensions`, et recharge l'onglet
pour PageCustomer et PetPage (leurs scripts s'injectent dans la page).

---

## Interactions PetPage

| Geste sur l'animal | Effet |
|---|---|
| 1 clic | caresse, petit saut et cœurs qui montent |
| 2 clics | une gamelle tombe du ciel, il court la manger |
| Cliquer-glisser | on l'attrape et on le lance, il retombe avec la gravité |
| Boutons du popup | « Nourrir » et « Sauter » à distance |

---

## Structure du dépôt

```
GameOpen/         extension 1 — manifest, popup, mini-jeux
PageCustomer/     extension 2 — manifest, popup, content script
PetPage/          extension 3 — manifest, popup, compagnon animé
docs/             la page de téléchargement publiée par GitHub Pages
publier.bat       met le site à jour en ligne
PRIVACY.md        politique de confidentialité
PUBLICATION-WEBSTORE.md   marche à suivre si un jour on publie sur le Web Store
```

Les trois extensions sont en **Manifest V3**, sans aucune dépendance ni outil de build :
du HTML, du CSS et du JavaScript, lisibles tels quels.

---

## Vie privée

Aucune donnée n'est collectée, aucune connexion réseau n'est faite. Tous les réglages
restent dans le stockage local de ton navigateur (`chrome.storage.local`) et sont
supprimés avec l'extension. Détails dans [PRIVACY.md](PRIVACY.md).

---

<div align="center">
<sub>Fait avec Claude Code · Icônes générées en vectoriel</sub>
</div>
