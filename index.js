const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openApi= require('./openapi.json');
const app = express();
const pool = require('./db.js');
const PORT = 3000;
// ──────────────────────
app.use(express.json());
app.post('/tasks', async (req, res) =>{
    const {title} = req.body;
    if (!title || title.trim() == ""){
        return res.status(400).json({error: "Title is required"});
    }
    const result = await pool.query("INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *", [title, false]);
    res.status(201).json(result.rows[0]);
});
// ──────────────────────


// ───── Fixed Database ───
let tasks = [
    {id: 1, title: "Buy the mona lisa", done: false},
    {id: 2, title: "Develop a black hole", done: false},
    {id: 3, title: "Meet abraham linclon",done: false}
];


// ─────Update a Task ───
app.put('/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id])
    if (existing.rows.length === 0){
        return res.status(404).json({error: `Task ${id} not found`});
    }
    const {title, done} = req.body;
    if (title !== undefined && title.trim() === ""){
        return res.status(400).json({error: "Title cannot be empty"});
    }
    const newTitle = title !== undefined ? title : existing.rows[0].title;
    const newDone = done !== undefined ? (done ? true : false) : existing.rows[0].done;
    const updated = await pool.query('UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *', [newTitle, newDone, id]);
    res.json(updated.rows[0]);
});
//───────────────────────


// ───── Delete Tasks ─── MODIFY! *
app.delete('/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await pool.query("SELECT * FROM tasks WHERE id = $1", [id])
    if (existing.rows.length === 0){return res.status(404).json({error: `Task ${id} not found`})}
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(204).send();
});
// ──────────────────────


// ───── Default ───
app.get('/', (req, res) => {
    res.json({ name: "Task API", version: "1.0", endpoints: ["/tasks"] });
});


// ───── Server Health ───
app.get('/health', (req, res) => {
    res.json({ status: "ok" });
});


// ───── Tasks ───
app.get('/tasks', async (req, res) => {
   const result = await pool.query('SELECT * FROM tasks');
   res.json(result.rows); 
});
// ──────────────────────


// ───── Tasks with id ───
app.get('/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const result = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (result.rows.length === 0){
        return res.status(404).json({error: `Task ${id} not found`});
    }
    res.json(result.rows[0]);
});
// ──────────────────────


// ───── Swagger UI ───
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApi));
// ──────────────────────


// ───── Listen Message ───
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
// ────────────────────── 