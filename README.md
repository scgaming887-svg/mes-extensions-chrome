<div align="center">

# Mes extensions Chrome

**GameOpen** · **PageCustomer** · **PetPage** · **ResearchFast.Page**

Quatre extensions faites maison, gratuites, sans publicité et sans collecte de données.

### 👉 [**Page de téléchargement**](https://scgaming887-svg.github.io/mes-extensions-chrome/) 👈

*Les quatre y sont, avec un bouton par extension et un pack complet.*

</div>

---

## Les quatre extensions

<table>
<tr>
<td width="80"><img src="GameOpen/icons/icon128.png" width="64"></td>
<td>

### GameOpen · v1.1.0
[⬇️ Télécharger](https://scgaming887-svg.github.io/mes-extensions-chrome/downloads/GameOpen.zip)

Lance tes applications de bureau depuis le navigateur, et joue en attendant.

- 9 raccourcis prêts : Roblox, Discord, Steam, Spotify, Epic, Minecraft, Twitch, VS Code, YouTube
- Clic gauche : ouvre l'application installée · Clic droit : ouvre la version web
- Ajoute tes propres raccourcis (nom, emoji, protocole, site)
- **Six mini-jeux** intégrés, records sauvegardés : Snake, Casse-brique, Flappy, 2048, Paires, Simon

</td>
</tr>
<tr>
<td><img src="PageCustomer/icons/icon128.png" width="64"></td>
<td>

### PageCustomer · v1.0.0
[⬇️ Télécharger](https://scgaming887-svg.github.io/mes-extensions-chrome/downloads/PageCustomer.zip)

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

### PetPage · v1.2.1
[⬇️ Télécharger](https://scgaming887-svg.github.io/mes-extensions-chrome/downloads/PetPage.zip)

Un compagnon animé qui vit en bas de tes pages.

- 18 animaux au choix, taille, vitesse et nom réglables
- Il marche, s'ennuie, s'endort, saute tout seul et te suit à la souris
- Nourriture adaptée à l'espèce : poisson pour le chat, os pour le chien, carotte pour le lapin…
- Physique réelle : attrape-le, lance-le, il retombe et s'écrase au sol
- **Il a faim, et ça se voit** : la faim court sur l'horloge réelle et survit à la fermeture du navigateur
  - petit creux → il te le dit
  - affamé → il **s'allonge** sur le flanc, les couleurs pâlissent
  - à bout → il **se fâche**, tremble, refuse les câlins tant qu'il n'a pas mangé
  - jauge d'humeur dans le popup, et vitesse de la faim réglable (8 h / 3 h / 25 min)
  - **l'exercice creuse l'appétit** : chaque saut que *tu* déclenches avance la jauge d'environ 1 % — ses sauts spontanés, eux, ne comptent pas
- **Il va se coucher** : un lit apparaît, il marche jusqu'à lui, s'y endort avec des 💤 — un clic le réveille
- **Trois mini-jeux** lancés depuis le popup, joués directement sur la page :
  - 🍬 *Attrape les friandises* — bouge la souris, rattrape tout avant le sol (3 vies)
  - 🌵 *Saute les obstacles* — course sans fin, Espace ou clic pour sauter
  - 🏁 *La grande course* — clique le plus vite possible pour battre le rival
- Désactivable site par site

</td>
</tr>
<tr>
<td><img src="ResearchFast.Page/icons/icon128.png" width="64"></td>
<td>

### ResearchFast.Page · v1.4.2
[⬇️ Télécharger](https://scgaming887-svg.github.io/mes-extensions-chrome/downloads/ResearchFast.Page.zip)

Trouve la meilleure offre pour ce que tu cherches.

- Tape ton article : l'extension ouvre la recherche sur **Amazon, eBay, Best Buy et Marketplace** d'un coup
- **Page de comparaison** : une colonne par site, remplie en direct pendant que les onglets se scannent en arrière-plan — plus besoin de les visiter un par un
- Elle lit chaque page de résultats et en extrait titre, prix, note et fiabilité
- **Deux curseurs de prix** — un minimum et un budget maximum, jusqu'à 100 000 $ — avec refiltrage instantané sans rescanner. Ils ne peuvent pas se croiser : celui qu'on ne bouge pas cède
- **Le classement s'adapte à ton budget** (voir plus bas)
- **La note veut dire ce qu'elle dit** : Amazon note le produit, eBay note le **vendeur**, Marketplace ne publie rien
- Écarte les accessoires : chercher « casque bluetooth » ne remonte pas les étuis pour casque
- Filtres : prix minimum, note minimale, mots à exclure, masquer les sponsorisés
- Mode générique de secours sur les autres boutiques
- Sur Best Buy, la recherche est **tapée dans le champ du site** : son adresse de recherche change sans prévenir, donc on la laisse la fabriquer elle-même

</td>
</tr>
</table>

---

## Installation

Va sur la **[page de téléchargement](https://scgaming887-svg.github.io/mes-extensions-chrome/)**, prends le `.zip` qui t'intéresse, puis :

1. **Décompresse-le** — clic droit → *Extraire tout*. Chrome ne lit pas les archives, il lui faut un dossier. Garde-le à un endroit fixe.
2. Ouvre **`chrome://extensions`** *(ou `edge://extensions` sur Edge)*
3. Active le **Mode développeur**, en haut à droite
4. Clique **Charger l'extension non empaquetée** et choisis le dossier extrait

> **À savoir** : Chrome affiche un bandeau « Désactiver les extensions en mode développeur » à chaque démarrage. C'est normal hors du Web Store, tu peux le fermer. Et si tu déplaces ou supprimes le dossier, l'extension cesse de fonctionner.

### Depuis le dépôt (pour développer)

```bash
git clone https://github.com/scgaming887-svg/mes-extensions-chrome.git
```

Puis charge directement les dossiers `GameOpen/`, `PageCustomer/`, `PetPage/` ou `ResearchFast.Page/`.
Après chaque modification : bouton ↻ sur `chrome://extensions`, et recharge l'onglet
pour les trois extensions qui s'injectent dans les pages.

---

## Comment ResearchFast classe les offres

Chaque annonce reçoit une note sur 100 qui croise **pertinence, prix, qualité et fiabilité**.
La pondération change selon la place de ton budget dans le marché — comparée au **prix médian**
des annonces trouvées :

| Ton budget | Poids du prix | Poids de la qualité | Mode affiché |
|---|---|---|---|
| Moins de 0,8 × le médian | **47 %** | 25 % | *Budget serré : priorité au prix* |
| Entre 0,8 × et 1,6 × | 33 % | 37 % | *Budget moyen : à parts égales* |
| Plus de 1,6 ×, ou aucun budget | 18 % | **52 %** | *Budget confortable : priorité à la qualité* |

Deux principes derrière ça :

- **Dépenser son budget n'est pas une faute.** La pénalité de prix est plafonnée, sinon le
  classement pousserait toujours vers le moins cher et le budget ne servirait à rien.
- **Un article mal noté ne prend jamais la tête.** Sous 3,5 ★, il subit un malus même en
  chasse au prix. Un rabais ne rachète pas trois étoiles.

### Les boutiques couvertes

| Boutique | Comment la recherche est lancée | Pays |
|---|---|---|
| Amazon | adresse directe `/s?k=` | .ca · .com · .fr |
| eBay | adresse directe `_nkw=` | .ca · .com · .fr |
| Best Buy | adresse directe `/fr-ca/chercher?search=` · repli : saisie dans leur champ | Canada · États-Unis |
| Marketplace | adresse directe `/marketplace/search/` | partout |
| Autres boutiques | bouton 🔎 pour scanner la page affichée | partout |

Best Buy est un cas à part : **son chemin de recherche est traduit**. En français c'est
`/fr-ca/chercher`, pas `/fr-ca/search` — ce dernier renvoie une page 404. Le site bloquant
toute vérification automatique (403), l'adresse a dû être relevée depuis un vrai navigateur.

Filet de sécurité : si une page de résultats ne donne rien — parce qu'ils auraient encore
changé leur adresse — l'extension **tape la recherche dans leur propre champ** et laisse le
site fabriquer la bonne adresse. Elle se répare donc toute seule.

### Ce que « la note » signifie sur chaque site

| Site | La note porte sur | Détail |
|---|---|---|
| Amazon | **le produit** | étoiles et nombre d'avis de la fiche |
| eBay | **le vendeur** | son % d'avis positifs et son nombre de ventes — 90 % → 0 ★, 100 % → 5 ★ |
| Best Buy | **le produit** | étoiles et nombre d'avis de la fiche · Canada et États-Unis seulement |
| Marketplace | **rien** | Facebook ne publie aucune note sur ses pages de résultats |

Chaque note est étiquetée et colorée selon sa nature, pour ne jamais mélanger « 4,7 ★ produit »
et « 99 % vendeur ». Une note inconnue est traitée comme neutre : ni favorisée, ni pénalisée.

---

## Interactions PetPage

| Geste sur l'animal | Effet |
|---|---|
| 1 clic | caresse, petit saut et cœurs qui montent |
| 2 clics | une gamelle tombe du ciel, il court la manger |
| Cliquer-glisser | on l'attrape et on le lance, il retombe avec la gravité |
| Boutons du popup | « Nourrir » et « Sauter » à distance |

Les sauts que tu provoques — clic ou bouton — lui donnent faim plus vite : environ 38 sauts
suffisent à le faire passer de repu à « petit creux ». Les sauts qu'il fait de lui-même sont gratuits.

---

## Structure du dépôt

```
GameOpen/            extension 1 — manifest, popup, 6 mini-jeux
PageCustomer/        extension 2 — manifest, popup, content script
PetPage/             extension 3 — manifest, popup, compagnon animé
ResearchFast.Page/   extension 4 — manifest, popup, lecteur de pages de vente,
                                   page de comparaison, classement partagé
docs/                la page de téléchargement publiée par GitHub Pages
publier.bat          met le site à jour en ligne
PRIVACY.md           politique de confidentialité
```

Les quatre extensions sont en **Manifest V3**, sans aucune dépendance ni outil de build :
du HTML, du CSS et du JavaScript, lisibles tels quels.

---

## Compatibilité connue

| | Chrome | Edge |
|---|---|---|
| GameOpen | ✅ | à vérifier |
| PageCustomer | ✅ | à vérifier |
| PetPage | ✅ | ✅ |
| ResearchFast.Page | ✅ | à vérifier |

Edge est basé sur Chromium : ces extensions s'y chargent de la même façon.
PetPage y a été confirmée, les autres devraient suivre sans surprise.

---

## Vie privée

Aucune donnée n'est collectée, aucune connexion réseau n'est faite. Tous les réglages
restent dans le stockage local de ton navigateur (`chrome.storage.local`) et sont
supprimés avec l'extension.

ResearchFast.Page lit le contenu des pages de résultats que tu lui demandes de scanner —
c'est sa fonction même — mais rien n'en sort. Détails dans [PRIVACY.md](PRIVACY.md).

---

<div align="center">
<sub>Fait avec Claude Code · Icônes générées en vectoriel</sub>
</div>
