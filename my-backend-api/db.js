const { Pool } = require('pg');

// Set up PostgreSQL connection
const pool = new Pool({
  user: 'postgres',  // Replace with your PostgreSQL username
  host: 'localhost',
  database: 'books_db',  // Replace with your database name
  password: 'pregres',  // Replace with your PostgreSQL password
  port: 5432,  // Default PostgreSQL port
});

// Check the connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('Connected to PostgreSQL');
  }
});

module.exports = pool;