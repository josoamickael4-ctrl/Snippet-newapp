# Installation de Snipe-IT sur ton PC (Windows)

Coucou ! Voici la marche à suivre pour installer le projet avec ton setup (PHP 8.3, MariaDB, etc.).

### 1. Trucs à installer
- **PHP 8.3** : Apparemment tu as déjà choisi la version "Thread Safe" VS16 x64, c'est parfait.
- **MariaDB 10.11** (ou MySQL 8.0).
- **Apache 2.4**.
- **Composer** (dernière version).
- **Node.js**.

### 2. Configurer PHP
Vérifie dans ton dossier PHP (le fichier `php.ini`) que ces extensions sont bien actives (enlève le `;` au début des lignes) :
`extension=curl`, `extension=fileinfo`, `extension=gd`, `extension=intl`, `extension=mbstring`, `extension=openssl`, `extension=pdo_mysql`, `extension=zip`.

### 3. Préparer la base de données
1. Ouvre ton client MariaDB/MySQL (ou via la console).
2. Crée une base de données, par exemple :
   ```sql
   CREATE DATABASE snipeit;
   ```

### 4. Configurer le projet
Ouvre le fichier `.env` à la racine et modifie la partie Database comme ça :
```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=snipeit
DB_USERNAME=ton_pseudo
DB_PASSWORD=ton_mot_de_passe
```

### 5. Installation finale
Ouvre un terminal (CMD ou PowerShell) dans le dossier du projet :

```powershell
# 1. Installer les dépendances
composer install --ignore-platform-reqs
npm install
npm run prod

# 2. Préparer l'appli
php artisan key:generate
php artisan migrate --seed --force
```

### 6. Lancer le site
```powershell
php artisan serve
```
Et voilà, c'est dispo sur **http://localhost:8000** !

**Login par défaut :**
- Username : `admin`
- Password : `password`
