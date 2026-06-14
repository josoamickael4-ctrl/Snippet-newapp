import mysql from 'mysql2';

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root123',
  database: 'snipeit'
});

connection.connect((err) => {
  if (err) {
    console.error('Erreur de connexion MySQL :', err);
    return;
  }
  console.log('Connecté à MySQL');
});

export async function deleteAllUsers() {
  return new Promise((resolve, reject) => {
    connection.query('DELETE FROM users WHERE id != 1', (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export default connection;