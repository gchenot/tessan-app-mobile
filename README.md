# Mini salle d’attente de téléconsultation

Deux projets TypeScript dans un même dépôt : une API NestJS dans `api/` et une application React Native avec Expo dans `app/`.

## État actuel

Le dépôt contient pour l’instant les projets initialisés. La file d’attente et les deux écrans du sujet seront ajoutés dans les prochaines étapes.

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

Pour l’instant, `http://localhost:3000/` renvoie la réponse d’exemple NestJS.

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

`check` lance le lint des deux projets, la vérification TypeScript des deux projets et les tests de l’API. Chaque projet possède son propre `package-lock.json` ; le `package.json` à la racine sert seulement de raccourci pour ces commandes.
