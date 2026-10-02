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

app.get('/notes', (req, res) => {
    res.json(notes);
});

app.post('/notes', (req, res) => {
    req.body.id = count;
    notes.push(req.body);
    count = count + 1;
    
    res.send('Data was added to notes');
});

app.delete('/notes/:id', (req, res) => {
    const targetID = Number(req.params.id);
    const updatedNotes = notes.filter(note => note.id !== targetID)
    notes = [...updatedNotes];

    res.send('Note was sucessfully deleted!')
});

app.put('/notes/:id', (req,res) =>{
    const targetID = Number(req.params.id);
    const targetNote = notes.find(note => note.id === targetID);
    
    if(targetNote === undefined){
        return res.status(404).json({message: 'Item not found'});
    }

    targetNote.title = req.body.title;
    targetNote.content = req.body.content;
    targetNote.id = targetID;

    res.send("Data was updated");
});



