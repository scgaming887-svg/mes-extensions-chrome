# Politique de confidentialité — GameOpen, PageCustomer, PetPage, ResearchFast.Page, SnapCoach, KeySound

*Dernière mise à jour : 24 août 2026*

## Résumé

Ces extensions ne collectent, ne transmettent et ne vendent **aucune donnée
personnelle**. Il n'y a ni serveur, ni compte, ni statistique, ni publicité.

**Une seule exception, entièrement sous ton contrôle : SnapCoach.** Si — et seulement
si — tu y ajoutes ta propre clé API Anthropic, la conversation que tu demandes à
analyser est envoyée à l'API de Claude pour obtenir un avis. Sans clé, l'extension
fonctionne entièrement hors ligne et rien ne quitte ton appareil. Voir la section
dédiée plus bas.

## Données enregistrées

Chaque extension enregistre uniquement tes réglages, dans le stockage local du
navigateur (`chrome.storage.local`). Ces données ne quittent jamais ton appareil
et ne sont accessibles ni à l'auteur, ni à un tiers.

| Extension | Données enregistrées |
|---|---|
| GameOpen | Liste de raccourcis personnalisée, meilleurs scores des mini-jeux |
| PageCustomer | Préférences d'apparence, globales et par nom de domaine |
| PetPage | Animal choisi, nom, taille, vitesse, options, sites désactivés, nombre de repas, records des mini-jeux |
| ResearchFast.Page | Ta recherche en cours, tes filtres, et les annonces extraites du dernier scan |
| KeySound | Ton ambiance, ton volume et la liste des sites que tu as coupés. **Aucune frappe n'est enregistrée** |
| SnapCoach | Ta clé API si tu en ajoutes une, le modèle et le ton choisis. **Aucune conversation n'est enregistrée** : elle est analysée puis oubliée à la fermeture de l'onglet |

## SnapCoach et la connexion à Claude

SnapCoach s'exécute **uniquement sur `web.snapchat.com`** et lit la conversation
affichée à l'écran, ce qui est sa fonction même. Il n'accède à aucun autre site.

**Sans clé API** — le réglage par défaut — toute l'analyse se fait dans ton
navigateur. Aucune requête réseau n'est émise, et la conversation ne quitte jamais
ton appareil.

**Avec une clé API** que tu ajoutes toi-même, et à chaque fois que tu cliques sur
« Analyser » :

- le texte de la conversation affichée est envoyé à `api.anthropic.com` pour
  obtenir un avis et des propositions de réponse ;
- l'envoi est facturé sur **ton** compte Anthropic, aux tarifs de l'API ;
- l'usage de ces données est régi par les conditions d'Anthropic, pas par ce
  document ;
- rien d'autre n'est transmis : ni ton identité, ni celle de ton interlocuteur,
  ni l'historique des analyses précédentes.

Tu peux retirer la clé à tout moment depuis le popup : l'extension repasse
immédiatement en mode hors ligne.

**La clé est stockée en clair** dans le stockage local du navigateur, comme
n'importe quel réglage. Quiconque a accès à ta session Chrome peut donc la lire.
Ne l'utilise pas sur un ordinateur partagé, et révoque-la depuis
`console.anthropic.com` si tu penses l'avoir exposée.

## KeySound et tes frappes

KeySound écoute les touches pour jouer un son, ce qui demande d'être explicite :
il lit le **nom** de la touche uniquement pour choisir entre cinq sons
(lettre, espace, entrée, retour, modificateur), puis ne le conserve pas.

- **Rien n'est stocké** : aucun journal de frappe, aucun historique, aucun compteur.
- **Rien n'est envoyé** : l'extension n'émet aucune requête réseau, les sons étant
  fabriqués dans le navigateur.
- Une option permet de **rester muet dans les champs de mot de passe**, et une autre
  de couper le son sur un site précis.

## Accès aux pages web

PageCustomer, PetPage, ResearchFast.Page et SnapCoach s'exécutent sur les pages que tu
consultes, car c'est leur fonction même : appliquer un style, afficher un
compagnon animé, ou lire une liste d'annonces.

**PageCustomer et PetPage ne lisent pas** le contenu de tes pages.

**ResearchFast.Page, lui, lit le contenu de la page** que tu lui demandes de
scanner : c'est indispensable pour en extraire les titres, les prix et les notes.
Cette lecture n'a lieu que sur la page affichée, au moment où tu lances un scan ou
une recherche. Les annonces extraites sont gardées dans le stockage local de ton
navigateur pour te les afficher, et sont remplacées à chaque nouvelle recherche.
Tu peux les effacer d'un clic avec le bouton « vider » du popup.

Aucune de ces extensions **n'enregistre** ton historique de navigation ni
**n'envoie quoi que ce soit** sur le réseau. PageCustomer
utilise le nom de domaine du site uniquement pour retrouver les réglages que tu as
choisis pour ce site ; ce nom de domaine reste stocké localement.

## Suppression des données

Désinstaller une extension supprime toutes ses données. Tu peux aussi tout
réinitialiser depuis son bouton « Réinitialiser » quand il existe.

## Contact

Pour toute question sur cette politique : stephanecoterobotx@gmail.com
