const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openApi= require('./openapi.json');
const app = express();
const db = require('./db.js');
const PORT = 3000;
// ──────────────────────
app.use(express.json());
app.post('/tasks',(req, res) =>{
    const {title} = req.body;
    if (!title || title.trim() == ""){
        return res.status(400).json({error: "Title is required"});
    }
    const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
    const result =  insert.run(title, 0);
    const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newTask);
});
// ──────────────────────


// ───── Fixed Database ───
let tasks = [
    {id: 1, title: "Buy the mona lisa", done: false},
    {id: 2, title: "Develop a black hole", done: false},
    {id: 3, title: "Meet abraham linclon",done: false}
];


// ─────Update a Task ───
app.put('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing){
        return res.status(404).json({error: `Task ${id} not found`});
    }
    const {title, done} = req.body;
    if (title !== undefined && title.trim() === ""){
        return res.status(400).json({error: "Title cannot be empty"});
    }
    const newTitle = title !== undefined ? title : existing.title;
    const newDone = done !== undefined ? (done ? 1 : 0) : existing.done;
    db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(newTitle, newDone, id);
    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.json(updated);
});
//───────────────────────


// ───── Delete Tasks ───
app.delete('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    if (!existing){return res.status(404).json({error: `Task ${id} not found`})}
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
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
app.get('/tasks', (req, res) => {
   const tasks = db.prepare("SELECT * FROM tasks").all();
   res.json(tasks); 
});
// ──────────────────────


// ───── Tasks with id ───
app.get('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    if (!task){
        return res.status(404).json({error: `Task ${id} not found`});
    }
    res.json(task);
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