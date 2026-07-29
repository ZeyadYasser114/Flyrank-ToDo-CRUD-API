const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openApi= require('./openapi.json');
const app = express();
const db = require('./db.js');
const PORT = 3000;

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

// ───── Fixed Database ───
let tasks = [
    {id: 1, title: "Buy the mona lisa", done: false},
    {id: 2, title: "Develop a black hole", done: false},
    {id: 3, title: "Meet abraham linclon",done: false}
];

// ─────Update a Task ───
app.put('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const task = tasks.find(t => t.id === id);
    if (!task){return res.status(404).json({error: `Task ${id} not found`});}
    
    const {title, done} = req.body;
    if (title !== undefined && title.trim() === ""){return res.status(400).json({error: 'Task title cannot be empty'});}
    if(title !== undefined) task.title = title;
    if (done !== undefined) task.done = done;
    res.json(task);
});

// ───── Delete Tasks ───
app.delete('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1){return res.status(404).json({error: `Task ${id} not found`})}
    tasks.splice(index,1);
    res.status(204).send();
});
app.get('/', (req, res) => {
    res.json({ name: "Task API", version: "1.0", endpoints: ["/tasks"] });
});

app.get('/health', (req, res) => {
    res.json({ status: "ok" });
});

app.get('/tasks', (req, res) => {
   const tasks = db.prepare("SELECT * FROM tasks").all();
   res.json(tasks); 
});

app.get('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    if (!task){
        return res.status(404).json({error: `Task ${id} not found`});
    }
    res.json(task);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApi));

// ───── Listen Message ───
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});