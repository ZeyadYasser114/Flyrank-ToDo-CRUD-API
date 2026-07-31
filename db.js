const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init(){
  await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT false
      )
    `);

  const { rows } = await pool.query('SELECT COUNT(*) AS count FROM tasks');
  const count = parseInt(rows[0].count, 10);

  if (count === 0){
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Buy the mona lisa', false]);
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Develop a black hole', false]);
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Meet Abraham Linclon', false]);
  }
}

init();
module.exports = pool;