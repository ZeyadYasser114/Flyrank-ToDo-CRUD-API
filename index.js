const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openApi = require('./openapi.json');
const pool = require('./db.js');
const supabase = require('./supabase.js');
const app = express();
const PORT = 3000;
app.use(express.json());

// ──────────────────────────────
// Auth middleware
// ──────────────────────────────
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
     if (!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).json({error: "Access token required"})
    }
    const token = authHeader.split(' ')[1];
    if (!token){
        return res.status(401).json({error: "Access token required"})
    }    
    const { data, error } = await supabase.auth.getUser(token);
    if (error){
        return res.status(401).json({error: "Invalid or expired token"});
    }
    req.user = data.user;
    next();
}

// ──────────────────────────────
// Auth routes
// ──────────────────────────────

app.post('/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password){
        return res.status(400).json({error: "Email and password required"});
    }
    
    const { data , error} = await supabase.auth.signUp({email, password});  
    if (error){
        return res.status(400).json({error: error.message});
    }
    else{
        return res.status(201).json(data.user);
    }
})

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password){
        return res.status(400).json({error: "Email and password required"});
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error){
        return res.status(401).json({error: "Invalid login credentials"});
    }
    else{
        return res.status(200).json({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
        });
    }
});

app.post('/auth/logout', requireAuth, async (req, res) => {
        await supabase.auth.signOut()
        return res.status(204).send(    )
    
});

// ──────────────────────────────
// Public / protected demo routes
// ──────────────────────────────

app.get('/public/info', (req, res) =>{
    res.status(200).json({message: 'Hello stranger. you can see info now.'})
})

app.get('/protected/profile', requireAuth, async (req, res) => {
        return res.status(200).json({
            id: req.user.id,
            email: req.user.email,
            created_at: req.user.created_at
        });
});     

app.get('/protected/dashboard', requireAuth, (req, res) => {
    res.status(200).json({ message: `Welcome, ${req.user.email}` });
});

// ──────────────────────────────
// Task routes (CRUD)
// ──────────────────────────────

app.get('/tasks', async (req, res) => {
   const result = await pool.query('SELECT * FROM tasks');
   res.json(result.rows); 
});

app.get('/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const result = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
    if (result.rows.length === 0){
        return res.status(404).json({error: `Task ${id} not found`});
    }
    res.json(result.rows[0]);
});

app.post('/tasks', async (req, res) =>{
    const {title} = req.body;
    if (!title || title.trim() == ""){
        return res.status(400).json({error: "Title is required"});
    }
    const result = await pool.query("INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *", [title, false]);
    res.status(201).json(result.rows[0]);
});

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

app.delete('/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await pool.query("SELECT * FROM tasks WHERE id = $1", [id])
    if (existing.rows.length === 0){return res.status(404).json({error: `Task ${id} not found`})}
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(204).send();
});

// ──────────────────────────────
// Misc routes
// ──────────────────────────────

app.get('/', (req, res) => {
    res.json({ name: "Task API", version: "1.0", endpoints: ["/tasks"] });
});

app.get('/health', (req, res) => {
    res.json({ status: "ok" });
});

// ──────────────────────────────
// Swagger UI
// ──────────────────────────────
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApi));

// ──────────────────────────────
// Start server
// ──────────────────────────────
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});