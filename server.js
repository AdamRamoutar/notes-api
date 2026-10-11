require('dotenv').config();

const {Pool} = require('pg');

const express = require('express');
const app = express();
const port =  process.env.PORT || 3000;

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

app.use(express.json());
app.use(cors({origin: process.env.FRONTEND_URL || 'http://127.0.0.1:5500'}));



const pool = new Pool(

    process.env.DATABASE_URL 
    ? 
        {
            connectionString: process.env.DATABASE_URL,
        } 
    : 
        {
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            max: 20, //overide default max connections
            idleTimeoutMillis: 30000, //close idle clients after 30 seconds
            connectionTimeoutMillis: 2000, //return an error after 2 seconds if connection fails
        }   
);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, ()=>{
    console.log("The server is running");
});

app.get('/notes', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notes WHERE user_id = $1', [req.user.userId]);
        res.json(result.rows);   
    }
    catch (err) {
        console.error(err);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.post('/notes', authenticateToken, async (req, res) => {
    const { title, content } = req.body;

    try{
        const result = await pool.query('INSERT INTO notes (title, content, user_id) VALUES ($1, $2, $3) RETURNING *', 
                                     [title, content, req.user.userId]);
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.delete('/notes/:id', authenticateToken, async (req, res) => {
    const targetID = Number((req.params.id));

    try{
        const result = await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *', 
                                        [targetID, req.user.userId]);
        if(result.rowCount === 0){
            return res.status(404).json({message: 'Item not found. Nothing was deleted.'});
        }
        res.status(200).json({message: 'Item was successfully deleted.', note: result.rows[0]});
    }  
    catch (err) {
        console.error(err);
        res.status(500).json({error: 'Internal server error'});
    }  
});

app.put('/notes/:id', authenticateToken, async (req, res) => {

    const targetID = Number(req.params.id);
    const {title, content} = req.body;

    try{
        const result = await pool.query('UPDATE notes SET title = $1, content = $2 WHERE id = $3 AND user_id = $4 RETURNING*', 
                                        [title, content, targetID, req.user.userId]);  
        if(result.rowCount === 0){
            return res.status(404).json({message: 'Item not found. Nothing was updated.'});
        }

        res.status(200).json({message: 'Item was successfully updated.', note: result.rows[0]});
    }
    catch (err) {
        console.error(err);
        res.status(500).json({error: 'Internal server error'});
    }     
});

app.post('/register', async (req, res) => {
    const {email, password} = req.body;

    try{
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query('INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *',
                                        [email, hashedPassword]);

        res.status(201).json({message: 'User created successfully.'});
    }
    catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({error: 'Email already exists.'});
        }
        console.error(err);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.post('/login', async (req, res) => {
    const {email, password} = req.body;
    try{
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if(!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch){
            return res.status(401).json({message: 'Invalid email or password'});
        }

        const token = jwt.sign({userId: user.id, email: user.email}, process.env.JWT_SECRET, {expiresIn: '1h'});
        res.status(200).json({message: 'Login successful', token});
    }
    catch (err) {
        console.error(err);
        res.status(500).json({message: 'Internal server error.'});
    }
});

function authenticateToken(req, res, next) {
    
    try {
        const authHeader = req.headers.authorization;

        if(!authHeader){
            return res.status(401).json({message: 'Access denied, no token provided'});
        }

        const token = authHeader.split(' ')[1];
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();    
    }
    catch (err) {
        if(err.name === 'TokenExpiredError') {
           return res.status(401).json({message: 'Token has expired.'});
        }
        return res.status(403).json({ message: 'Invalid token.' });
    }
}




