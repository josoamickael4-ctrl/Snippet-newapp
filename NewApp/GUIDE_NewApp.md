# GUIDE NewApp

## 1. Objectif de ce guide

Ce fichier explique pas à pas :
- ce que fait le backend (`server/`)
- ce que fait le frontend (`src/`)
- comment une `API` fonctionne
- comment appeler Snipe-IT
- comment créer et utiliser une API SQLite
- comment faire un tableau en Vue
- ce qu'est `v-for` et pourquoi on l'utilise

C'est expliqué très simplement, comme si tu partais de zéro.

---

## 2. Le backend : le serveur Node / Express

### 2.1 Le fichier principal : `server/index.js`

Ce fichier démarre le serveur et dit où écouter.

Il fait :
- `import express from 'express'` : utilise le framework Express pour créer un serveur.
- `app.use(cors())` : autorise les autres applications (comme ton frontend) à envoyer des requêtes.
- `app.use(bodyParser.json())` : dit au serveur de lire les données JSON envoyées par le frontend.
- `app.use('/api/tickets', ticketsRouter)` : connecte l'URL `/api/tickets` au fichier `server/routes/tickets.js`.
- `app.use('/api/snipe-it', snipeitRouter)` : connecte l'URL `/api/snipe-it` au fichier `server/routes/snipeit.js`.
- `app.listen(port, ...)` : démarre vraiment le serveur sur le port 3000.

C'est le point d'entrée du backend : si tu veux changer un routeur, regarde ici pour voir quelle route utilise quel fichier.

### 2.2 Le fichier de configuration : `server/config.js`

Ce fichier contient les informations de connexion à Snipe-IT :
- `SNIPE_URL` : l'adresse du serveur Snipe-IT
- `SNIPE_TOKEN` : le token secret pour s'identifier
- `snipeHeaders` : les en-têtes HTTP utilisés quand le serveur appelle Snipe-IT

Ces valeurs viennent de l'environnement (`process.env`) : cela veut dire qu'elles sont stockées dans un fichier `.env` ou dans ton système. Si tu veux changer l'URL ou le token Snipe-IT, c'est ici qu'il faut le configurer.

### 2.3 La base SQLite : `server/db.js`

Ce fichier crée et ouvre la base de données SQLite.

Il contient :
- `better-sqlite3` : une bibliothèque pour parler à SQLite.
- un fichier `database/newapp.sqlite` : c'est la base de données.
- la création automatique des tables si elles n'existent pas.

Les tables créées sont :
- `imported_data` : données importées
- `statuses` : statuts de ticket
- `priorities` : priorités
- `tickets` : tickets
- `color_statut` : couleurs et traductions des statuts

Si tu veux changer la structure de la base de données, c'est ici que tu modifies les commandes SQL `CREATE TABLE`.

### 2.4 Les routes principales : `server/routes/*.js`

Ces fichiers contiennent les actions que le backend peut faire.

#### `server/routes/tickets.js`

Ce fichier gère les tickets. Il propose :
- `GET /api/tickets` : lire tous les tickets
- `POST /api/tickets` : créer un nouveau ticket
- `POST /api/tickets/kanban-config` : enregistrer la couleur d'un statut
- `GET /api/tickets/kanban-config` : lire les couleurs de statut
- `PATCH /api/tickets/:id` : modifier un ticket existant

Ce fichier montre comment utiliser SQLite pour :
- rechercher un statut ou une priorité existante
- créer un statut/priorité si besoin
- insérer un ticket
- mettre à jour un ticket

Si tu veux changer ce que fait `/api/tickets`, c'est dans ce fichier.

#### `server/routes/snipeit.js`

Ce fichier sert d'API intermédiaire vers Snipe-IT.

Il fait :
- `GET /api/snipe-it/:endpoint`

Exemple : si le frontend appelle `/api/snipe-it/hardware`, le serveur construit la requête vers Snipe-IT et renvoie les données.

C'est utile parce que le frontend n'appelle pas directement Snipe-IT, mais passe par ton serveur. Ce serveur ajoute le token secret.

#### `server/routes/importData.js`

Ce fichier gère l'import de données.

Il propose :
- `GET /api/sources` : liste des sources importées
- `GET /api/data` : toutes les données importées
- `POST /api/import` : importer une source de données
- `POST /api/import/tickets` : importer un ensemble de tickets

Si tu dois changer l'importation de fichiers ou la logique d'import, regarde ici.

### 2.5 Les autres fichiers de route

Tu as aussi :
- `server/routes/reset.js` : probablement pour réinitialiser des données
- `server/routes/importAssets.js` : probablement pour importer des fichiers ou des assets

Ces deux fichiers ne sont pas détaillés ici, mais leur rôle est similaire : ils définissent un ensemble d'URL que ton backend peut traiter.

---

## 3. Le frontend : Vue + router

### 3.1 Le routeur Vue : `src/router/index.js`

Ce fichier définit les pages de l'application.

Il fait :
- `createRouter` : crée le routeur
- `createWebHistory()` : active la navigation normale
- `routes` : liste des chemins et des composants associés

Exemples :
- `/` : page d'accueil front office, affiche `ListeElements`
- `/creer-ticket` : affiche `CreerTicket`
- `/kanban` : affiche `Kanban`
- `/backoffice/login` : affiche la page de connexion
- `/backoffice/tickets` : affiche la page de gestion des tickets

### 3.2 Comment fonctionne `router-view`

Dans `src/App.vue`, tu as :
```vue
<template>
  <router-view></router-view>
</template>
```

`<router-view>` est comme un écran : il affiche le composant correspondant à l'adresse actuelle.
- si tu es sur `/`, il affiche `ListeElements`
- si tu es sur `/backoffice/tickets`, il affiche `Tickets`

### 3.3 La protection du backoffice

La fonction `router.beforeEach` vérifie si l'utilisateur est connecté :
- si l'URL commence par `/backoffice` et que l'utilisateur n'est pas connecté, il redirige vers `/backoffice/login`

C'est ici que se trouve la logique de sécurité basique.

---

## 4. Comment fonctionne une API

Une API est un ensemble d'adresses web (URL) que le frontend peut appeler.

Dans ton projet :
- le backend écoute sur `http://localhost:3000`
- le frontend envoie des requêtes à `http://localhost:3000/api/...`

Exemples :
- `GET http://localhost:3000/api/tickets` : lire les tickets
- `POST http://localhost:3000/api/tickets` : créer un ticket
- `GET http://localhost:3000/api/snipe-it/hardware` : demander des données à Snipe-IT

Une requête peut envoyer des données :
- `GET` pour lire
- `POST` pour créer
- `PATCH` pour modifier

---

## 5. Appeler l'API Snipe-IT

### 5.1 Où ça se passe

C'est dans `server/routes/snipeit.js`.

Ce fichier récupère le paramètre `:endpoint`, puis fait une requête vers Snipe-IT avec Axios.

### 5.2 Exemple réel

Si le frontend veut récupérer le matériel Snipe-IT, il peut appeler :

`GET /api/snipe-it/hardware`

Le serveur convertit cela en :

`GET ${SNIPE_URL}/api/v1/hardware`

### 5.3 Pourquoi c'est utile

Simple : le frontend ne connaît pas le token secret.

Le backend ajoute le token dans `snipeHeaders` et envoie la requête à Snipe-IT. Le frontend ne voit pas le token.

### 5.4 Comment changer l'URL ou le token

Regarde `server/config.js` :
- `SNIPE_URL` est l'adresse
- `SNIPE_TOKEN` est le token

Tu peux aussi changer ces valeurs dans ton fichier `.env` si tu en as un.

---

## 6. Créer une API SQLite pour ton application

### 6.1 Le lien avec `server/db.js`

`server/db.js` ouvre la base SQLite et crée les tables.

Si tu veux ajouter une nouvelle table, c'est ici.

### 6.2 Exemple : ajouter une table

Imaginons que tu veux stocker des commentaires :

```js
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER,
  text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(ticket_id) REFERENCES tickets(id)
);
```

Tu ajouterais cette commande dans `db.exec(...)`.

### 6.3 Exemple : nouvelle route API

Pour lire ces commentaires, tu peux créer un nouveau fichier `server/routes/comments.js` :

```js
import express from 'express';
import db from '../db.js';
const router = express.Router();

router.get('/:ticketId', (req, res) => {
  const ticketId = req.params.ticketId;
  const rows = db.prepare('SELECT * FROM comments WHERE ticket_id = ?').all(ticketId);
  res.json(rows);
});

export default router;
```

Puis dans `server/index.js` :

```js
import commentsRouter from './routes/comments.js';
app.use('/api/comments', commentsRouter);
```

### 6.4 Exemple : créer un enregistrement

Dans le même fichier :

```js
router.post('/', (req, res) => {
  const { ticket_id, text } = req.body;
  const result = db.prepare(
    'INSERT INTO comments(ticket_id, text) VALUES (?, ?)'
  ).run(ticket_id, text);
  res.json({ id: result.lastInsertRowid });
});
```

Maintenant tu peux envoyer une requête POST à `http://localhost:3000/api/comments`.

---

## 7. Vue : faire un tableau

Dans Vue, un tableau HTML est souvent fait avec :

```vue
<table>
  <thead>
    <tr>
      <th>ID</th>
      <th>Titre</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="ticket in tickets" :key="ticket.id">
      <td>{{ ticket.id }}</td>
      <td>{{ ticket.titre }}</td>
      <td>{{ ticket.status }}</td>
    </tr>
  </tbody>
</table>
```

### 7.1 Que signifie `v-for`

`v-for` est une directive Vue qui répète un élément pour chaque élément d'une liste.

- `ticket in tickets` : pour chaque ticket dans la liste `tickets`
- `:key="ticket.id"` : Vue utilise cette clé pour savoir quel élément est quel. C'est important pour la performance.

En résumé : `v-for` crée un rang (`<tr>`) par élément de la liste.

### 7.2 Pourquoi on l'utilise

Parce qu'en JavaScript on ne veut pas écrire à la main chaque ligne.

Si tu as 10 tickets, `v-for` crée 10 lignes automatiquement.

### 7.3 Exemple simple

```vue
<template>
  <ul>
    <li v-for="fruit in fruits" :key="fruit">
      {{ fruit }}
    </li>
  </ul>
</template>

<script setup>
const fruits = ['pomme', 'banane', 'poire'];
</script>
```

Cela affiche : pomme, banane, poire.

---

## 8. Exemple complet de tableau avec API

### 8.1 Charger des tickets depuis le backend

Dans un composant Vue, tu peux écrire :

```vue
<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const tickets = ref([]);
const erreur = ref('');

async function loadTickets() {
  try {
    const response = await axios.get('http://localhost:3000/api/tickets');
    tickets.value = response.data;
  } catch (e) {
    erreur.value = e.message;
  }
}

onMounted(loadTickets);
</script>

<template>
  <div>
    <p v-if="erreur">Erreur : {{ erreur }}</p>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Titre</th>
          <th>Status</th>
          <th>Priorité</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ticket in tickets" :key="ticket.id">
          <td>{{ ticket.id }}</td>
          <td>{{ ticket.titre }}</td>
          <td>{{ ticket.status }}</td>
          <td>{{ ticket.priority }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

### 8.2 Ce que fait ce code

- `ref([])` : crée une variable réactive pour stocker la liste des tickets.
- `onMounted(loadTickets)` : lance `loadTickets` quand le composant apparaît.
- `axios.get(...)` : appelle le backend.
- `v-for` : affiche les tickets dans le tableau.

---

## 9. Où toucher quand tu dois changer quelque chose

### 9.1 Si tu dois changer une fonctionnalité backend

Regarde d'abord :
- `server/index.js` : pour savoir quelles routes sont activées
- `server/routes/*.js` : pour modifier la logique métier
- `server/db.js` : si tu changes la structure de la base de données
- `server/config.js` : si tu changes Snipe-IT ou les secrets

### 9.2 Si tu dois changer une page Vue

Regarde :
- `src/router/index.js` : pour savoir quelle page s'affiche pour quelle URL
- `src/pages/` : les composants de page
- `src/App.vue` : le conteneur principal

### 9.3 Si tu dois changer un tableau ou la façon dont les données s'affichent

Regarde les composants qui utilisent `v-for` et `axios`, puis cherche :
- `tickets` dans les fichiers
- `router-view`
- `@click`, `@submit`, `v-model`

---

## 10. Bonnes pratiques quand tu changes

- Ne touche pas plusieurs fichiers à la fois sans comprendre pourquoi.
- Sauvegarde une copie avant de changer si tu as peur.
- Ajoute des `console.log(...)` pour voir ce que fait le code.
- Teste d'abord une petite modification.
- Si tu changes l'URL d'une route, cherche toutes les utilisations de cette route.

---

## 11. Résumé simple

- `server/index.js` : démarre le backend et dit quelles routes existent.
- `server/routes/*.js` : contient les actions de l'API.
- `server/db.js` : gère la base SQLite.
- `server/config.js` : stocke l'URL et le token Snipe-IT.
- `src/router/index.js` : définit les pages et les chemins.
- `v-for` : répète un élément pour chaque élément d'une liste.
- `axios` : permet au frontend d'appeler le backend.

Tu peux maintenant utiliser ce guide comme feuille de route pour savoir quoi modifier.

Si tu veux, je peux aussi te créer un guide encore plus ciblé pour une page précise comme `Tickets.vue` ou `FileImport.vue`.