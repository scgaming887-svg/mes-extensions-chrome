# Publier les 3 extensions sur le Chrome Web Store

Objectif : obtenir un lien du type
`https://chromewebstore.google.com/detail/petpage/xxxxxxxx` avec un bouton
**« Ajouter à Chrome »** — installation en un clic sur n'importe quel ordinateur,
sans mode développeur, avec mises à jour automatiques.

---

## Étape 1 — Créer le compte développeur

1. Va sur https://chrome.google.com/webstore/devconsole
2. Connecte-toi avec ton compte Google
3. Paye les **frais d'inscription uniques de 5 $ US** (une seule fois, pas par extension)
4. Renseigne un **e-mail de contact vérifié** — c'est obligatoire avant toute publication

> ⚠️ Le compte doit t'appartenir. Si tu as moins de 18 ans, il faut passer par
> le compte d'un parent, les conditions Google l'exigent.

---

## Étape 2 — Les fichiers à envoyer

Les archives prêtes à téléverser sont dans `zip\store\` :

| Extension | Fichier à envoyer |
|---|---|
| GameOpen | `zip\store\GameOpen-store.zip` |
| PageCustomer | `zip\store\PageCustomer-store.zip` |
| PetPage | `zip\store\PetPage-store.zip` |

Chaque archive contient le `manifest.json` **à sa racine** (c'est la règle) et les
icônes 16/32/48/128. Les visuels promo sont exclus de l'archive, ils se téléversent
séparément dans le formulaire.

---

## Étape 3 — Les visuels

Déjà générés dans `<Extension>\store\` :

- `promo-440x280.png` — petite tuile promo
- `promo-1400x560.png` — bandeau (utile si l'extension est mise en avant)
- l'icône 128×128 est prise automatiquement dans le manifest

**Ce qui manque et que toi seul peux faire : les captures d'écran.**
Il en faut **au moins une**, au format **1280×800** ou **640×400**, en PNG ou JPEG.
Elles doivent montrer la vraie extension en fonctionnement — inventer des visuels
est un motif de refus.

Méthode simple :
1. Ouvre une page avec l'extension active et son popup ouvert
2. `Win + Maj + S` (Outil Capture) → capture la zone
3. Ouvre l'image dans Paint → *Redimensionner* → décoche « Conserver les proportions » → 1280 × 800
4. Enregistre en PNG

Idées de captures, une par extension :
- **GameOpen** : le popup ouvert sur l'onglet Apps, plus une seconde avec Snake en cours
- **PageCustomer** : un site connu avant / après le thème Nuit
- **PetPage** : le pingouin sur une page avec sa bulle, et le popup ouvert à côté

---

## Étape 4 — Les textes à copier-coller

### GameOpen

**Catégorie** : Divertissement
**Objectif unique** *(champ « Single purpose »)* :
> Lancer les applications de bureau de l'utilisateur depuis le navigateur, avec des mini-jeux d'attente.

**Description** :
```
GameOpen rassemble tes applications et tes jeux dans un seul bouton.

• Lance Roblox, Discord, Steam, Spotify, Epic Games, Minecraft, Twitch en un clic
• Clic droit sur un raccourci pour ouvrir la version web du service
• Ajoute tes propres raccourcis : nom, emoji, protocole et site web
• Deux mini-jeux intégrés pour patienter : Snake et Casse-brique
• Tes meilleurs scores et ta liste de raccourcis sont enregistrés

Aucune donnée n'est collectée ni transmise. Tout reste dans ton navigateur.

Note : une application ne peut être lancée que si elle est déjà installée sur
l'ordinateur. Le navigateur affiche alors une demande de confirmation.
```

**Justification des autorisations** :
| Autorisation | Justification à coller |
|---|---|
| `storage` | Enregistre localement la liste de raccourcis personnalisée de l'utilisateur et ses meilleurs scores aux mini-jeux. Sans cette autorisation, ces données seraient perdues à chaque fermeture du navigateur. |

---

### PageCustomer

**Catégorie** : Outils
**Objectif unique** :
> Modifier l'apparence des pages web selon les préférences visuelles de l'utilisateur.

**Description** :
```
PageCustomer change l'apparence de n'importe quel site selon tes goûts et ton confort de lecture.

• 6 thèmes en un clic : Nuit, Sépia, Néon, Lecture, Pastel
• Réglages express : mode sombre, gros texte, colonne de lecture, sans images, sans animations
• Couleurs de fond, de texte et de liens entièrement personnalisables
• Choix de la police, du zoom, de l'interligne, de la largeur de lecture, des coins arrondis
• Filtres de luminosité, contraste et saturation
• Zone de CSS personnalisé pour aller plus loin
• Réglages par site ou pour tous les sites à la fois

Utile pour lire plus confortablement, réduire la fatigue visuelle le soir,
ou simplement rendre un site plus agréable.

Aucune donnée n'est collectée ni transmise. Tes réglages restent dans ton navigateur.
```

**Justification des autorisations** :
| Autorisation | Justification à coller |
|---|---|
| `storage` | Enregistre les préférences d'apparence de l'utilisateur, globales et par site. Ce sont ces réglages qui sont réappliqués à chaque visite. |
| `activeTab` | Permet de lire le nom de domaine de l'onglet actif afin d'afficher et de modifier les réglages correspondant au site consulté. |
| `host_permissions: <all_urls>` | La fonction unique de l'extension est de restyler les pages que l'utilisateur consulte. Le script de contenu doit donc pouvoir injecter une feuille de style sur le site que l'utilisateur choisit, quel qu'il soit. Aucun contenu de page n'est lu ni transmis. |

---

### PetPage

**Catégorie** : Divertissement
**Objectif unique** :
> Afficher un compagnon animé interactif par-dessus les pages web.

**Description** :
```
PetPage fait vivre un petit compagnon en bas de tes pages web.

• 18 animaux au choix : chat, chien, renard, pingouin, panda, licorne, dragon…
• Il marche, s'ennuie, s'endort, saute et te suit à la souris
• Clique-le pour le caresser, double-clique pour le nourrir
• Sa nourriture s'adapte : poisson pour le chat, os pour le chien, carotte pour le lapin
• Attrape-le et lance-le : il retombe avec une vraie physique
• Taille, vitesse, nom et bulles de dialogue réglables
• Désactivable site par site

Aucune donnée n'est collectée ni transmise. Tout reste dans ton navigateur.
```

**Justification des autorisations** :
| Autorisation | Justification à coller |
|---|---|
| `storage` | Enregistre l'animal choisi, son nom, sa taille, sa vitesse, les sites désactivés et le nombre de repas donnés. |
| `activeTab` | Permet de lire le nom de domaine de l'onglet actif pour proposer le bouton « désactiver sur ce site ». |
| `scripting` | Permet de réinjecter le script du compagnon dans l'onglet actif quand l'utilisateur clique sur « Nourrir » ou « Sauter » alors que le script n'est plus actif, par exemple juste après une mise à jour de l'extension. Cela évite d'obliger l'utilisateur à recharger sa page. |
| `host_permissions: <all_urls>` | Le compagnon doit pouvoir apparaître sur les pages que l'utilisateur consulte, sans liste de sites prédéfinie. Aucun contenu de page n'est lu ni transmis. |

---

## Étape 5 — Le questionnaire « Confidentialité »

Réponses identiques pour les trois extensions :

- **Code exécuté à distance** : **Non**. Tout le code est inclus dans le paquet.
- **Collecte de données utilisateur** : **Aucune catégorie cochée**.
- Coche les trois attestations :
  - je ne vends pas les données à des tiers
  - je n'utilise pas les données à des fins étrangères à la fonction principale
  - je n'utilise pas les données pour évaluer la solvabilité ni accorder des prêts
- **URL de la politique de confidentialité** : voir `PRIVACY.md`, à héberger
  (le plus simple : un dépôt GitHub public, ou une page GitHub Gist).

---

## Étape 6 — Envoi et attente

1. *Nouvel élément* → téléverse le `.zip`
2. Remplis fiche, visuels, confidentialité
3. *Envoyer pour examen*

Délai d'examen : de **quelques heures à quelques jours**. **GameOpen** devrait
passer vite (aucune autorisation sensible). **PageCustomer** et **PetPage**
demandent `<all_urls>`, ce qui déclenche un examen manuel plus long et plus
strict — c'est normal, ne t'inquiète pas si ça prend une semaine.

Si l'une des deux est refusée pour cause d'autorisation trop large, la porte de
sortie est de passer `<all_urls>` en `optional_host_permissions` : l'utilisateur
autorise alors chaque site d'un clic. C'est moins pratique mais accepté sans
discussion. Dis-le moi et je fais la modification.

---

## Alternative gratuite : Microsoft Edge Add-ons

Même code, **aucun frais d'inscription**, et les extensions s'installent aussi
dans Edge en un clic. Console : https://partner.microsoft.com/dashboard/microsoftedge
Bon plan si tu veux tester la publication sans payer les 5 $.
