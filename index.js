const express = require('express');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');  
const openApi = require('./openapi.json');
const pool = require('./db.js');
const supabase = require('./supabase.js');
const triageSchema = require('./LLM/schema.js');
const OpenAI = require('openai');
const app = express();
const PORT = 3000;
const systemPrompt = fs.readFileSync('./prompts/triage-v1.md', 'utf-8');
app.use(express.json());

const client = new OpenAI({
    baseURL: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
    timeout: 30000, // 30 secs
    maxRetries: 0,
});

function extractJson(text) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return text.slice(start, end + 1);
}

function logCost(promptTokens, completionTokens, durationMs, repaired){
    console.log(JSON.stringify({
        promptVersion: 'V1',
        model: process.env.LLM_MODEL,
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        durationMs: durationMs,
        repaired: repaired,
        timestamp: new Date().toISOString(),
    }));
}

async function callWithRetry(messages){
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts ; attempt ++) {
        try {
            return await client.chat.completions.create({
                model: process.env.LLM_MODEL,
                temperature: 0,
                messages: messages,
            });
        } catch (err){
            const status = err.status;
            const retryable = status == 429 || status === 408 || (status >= 500 && status < 600);
            if (!retryable || attempt === maxAttempts - 1){
                throw err;
            }
            const delay = 1000 * Math.pow(2, attempt)
            const jitter = Math.random() * 500; 
            await new Promise(resolve => setTimeout(resolve, delay + jitter));
        }
    }
}

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

app.post('/triage', async (req ,res) => {
    const {text} = req.body;
    if (!text || text.trim() == "" || text.length > 2000){
        return res.status(400).json({error: "Text is required and must be under 2000 characters"})
    }
    if (process.env.LLM_STUB === '1'){ 
        return res.status(200).json({
            category: "other",
            urgency: "low",
            confidence: 0.5,
            reason: "stub response"
        })
    }
    if (process.env.LLM_ENABLED === 'false'){
        return res.status(503).json({error: "AI triage is temporarily disabled."})
    }
    try {
        const startTime = Date.now();
        const resultClient = await callWithRetry([
            {role: "system", content: systemPrompt},
            {role: "user", content: text}
        ]);
        const rawText = resultClient.choices[0].message.content;
        const jsonString = extractJson(rawText);
        let parsed;
        try{
            parsed = JSON.parse(jsonString);
        } catch (e) {
            parsed = null;
        }
        const validation = triageSchema.safeParse(parsed);
        if (validation.success){
            logCost(resultClient.usage.prompt_tokens, resultClient.usage.completion_tokens, Date.now() - startTime, false);
            return res.status(200).json(validation.data);
        }

        const repairResult = await callWithRetry([
            {role: "system", content: systemPrompt},
            {role: "user", content: text},
            {role: "assistant", content: rawText},
            {role: "user", content: `Your previous answer was rejected for this reason: ${validation.error.message}. Return only corrected json matching the schema.`}
        ]);
        const repairText = repairResult.choices[0].message.content;
        const repairJsonString = extractJson(repairText);
        let repairParsed;
        try{
            repairParsed = JSON.parse(repairJsonString);
        } catch (e){
            repairParsed = null;
        }
        const repairValidation = triageSchema.safeParse(repairParsed);
        if (repairValidation.success){
            logCost(repairResult.usage.prompt_tokens, repairResult.usage.completion_tokens, Date.now() - startTime, true);
            return res.status(200).json(repairValidation.data);
        }
        fs.appendFileSync('./logs/quarantine.jsonl', JSON.stringify({
            input: text,
            error: repairValidation.error.message,
            promptVersion: 'V1',
            timestamp:  new Date().toISOString()
        }) + '\n')
        return res.status(422).json({error: "Could not produce a valid classification for this input."});

    } catch (err) {
        return res.status(504).json({error: "Model call timed out or failed."});
    }
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