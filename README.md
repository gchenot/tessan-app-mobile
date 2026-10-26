# Mini salle d’attente de téléconsultation

Deux projets TypeScript dans un même dépôt : une API NestJS dans `api/` et une application React Native avec Expo dans `app/`.

## État actuel

L’API est implémentée et testée. L’application mobile contient encore son écran d’initialisation ; le parcours patient sera ajouté à l’étape suivante.

## Prérequis

- Node.js 24 LTS (`nvm use` à la racine si nvm est installé)
- npm
- Pour tester sur iPhone : Expo Go et un compte Expo connecté dans l’app et dans le terminal (`npx expo login`)

## Démarrer l’API

```sh
cd api
npm install
npm run start:dev
```

L’API écoute sur le port `3000`. La durée moyenne utilisée pour l’estimation est configurable (en minutes) :

```sh
AVERAGE_CONSULTATION_MINUTES=5 npm run start:dev
```

| Méthode | Route | Résultat |
| --- | --- | --- |
| `GET` | `/reasons` | Motifs disponibles (`id`, `label`) |
| `POST` | `/tickets` | Crée un ticket avec `{ "reason": "fievre" }` (`201`) |
| `GET` | `/tickets/:id` | Statut, position et attente estimée du ticket |
| `DELETE` | `/tickets/:id` | Annule un ticket en attente (`204`) |

La file commence avec trois tickets fictifs. Toutes les 20 secondes, le premier ticket `waiting` passe à `called`. Les autres avancent d’une place. Un ticket `called` ou `cancelled` reste consultable, avec `position` et `estimatedWaitMinutes` à `null`. L’estimation vaut `position × durée moyenne` ; les appels toutes les 20 secondes accélèrent seulement la démonstration et ne représentent pas la durée réelle d’une consultation.

L’API renvoie `400` pour un motif absent ou inconnu, `404` pour un ticket inexistant et `409` si un ticket appelé ou annulé est à nouveau supprimé. Les données sont uniquement en mémoire et sont réinitialisées au redémarrage.

## Démarrer l’application

Dans un deuxième terminal :

```sh
cd app
npm install
npm start
```

Scanner le code QR avec l’iPhone connecté au même réseau Wi-Fi que l’ordinateur. L’application affiche pour l’instant un écran d’initialisation.

## Vérifications

```sh
npm run check
npm run build
```

`check` lance le lint des deux projets, la vérification Prettier de l’API, la vérification TypeScript des deux projets, trois tests métier et deux tests HTTP de l’API. Chaque projet possède son propre `package-lock.json` ; le `package.json` à la racine sert seulement de raccourci pour ces commandes.
