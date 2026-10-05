require('dotenv').config();

const {Pool} = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    max: 20, //overide default max connections
    idleTimeoutMillis: 30000, //close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, //return an error after 2 seconds if connection fails
});


const express = require('express');
const app = express();
const port = 3000;
app.use(express.json());

let notes = [];
let count = 0;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, ()=>{
    console.log("The server is running");
});

app.get('/notes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notes');
        console.log(result.rows);
        res.json(result.rows);   
    }
    catch (err) {
        console.error(err);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.post('/notes', async (req, res) => {
    const { title, content } = req.body;

    try{
        const result = await pool.query('INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *', 
                                     [title, content]);
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.delete('/notes/:id', async (req, res) => {
    const targetID = Number((req.params.id));

    try{
        const result = await pool.query('DELETE FROM notes WHERE id = $1 RETURNING *', 
                                        [targetID]);
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

app.put('/notes/:id', async (req, res) => {

    const targetID = Number(req.params.id);
    const {title, content} = req.body;

    try{
        const result = await pool.query('UPDATE notes SET title = $1, content = $2 WHERE id = $3 RETURNING*', 
                                        [title, content, targetID]);  
        if(result.rowCount === 0){
            return res.status(404).json({message: 'Item not found. Nothing was updated.'});
        }

        res.status(200).json({message: 'Item was successfully updated.', note: result.rows[0]});
    }
    catch (err) {
        res.status(500).json({error: 'Internal server error'});
    }     
});


