const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('tasks.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
  )
`);

const count = db.prepare('SELECT COUNT(*) AS count FROM tasks').get().count;

if (count === 0) {
  const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  insert.run('Buy the mona lisa', 0);
  insert.run('Develop a black hole', 0);
  insert.run('Meet abraham linclon', 0);
}

module.exports = db;