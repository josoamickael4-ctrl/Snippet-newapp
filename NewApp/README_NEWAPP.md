# NewApp - Guide d'utilisation

NewApp est une application Vue.js liée à Snipe-IT permettant la gestion locale de données avec SQLite.

## Fonctionnalités
- **Tableau de Bord** : Visualise les données locales et vérifie la connexion à Snipe-IT.
- **Importation Avancée** : Aperçu des données, validation (champs obligatoires) et gestion des conflits (Ajouter ou Remplacer).
- **Gestion & Réinitialisation** : Réinitialisation sélective par source de données et système de sauvegarde (Backup JSON) avant suppression.
- **Échange JSON** : Communique avec Snipe-IT via des formats JSON.

## Démarrage rapide

### 1. Lancer le Backend (SQLite)
```powershell
cd NewApp
node server/index.js
```
Le serveur tournera sur **http://localhost:3000**.

### 2. Lancer le Frontend (Vue.js)
```powershell
cd NewApp
npm run dev
```
L'application sera dispo sur **http://localhost:5173**.

## Test d'importation
Utilisez le fichier `test_import.json` fourni à la racine de NewApp pour tester la fonctionnalité d'importation.
