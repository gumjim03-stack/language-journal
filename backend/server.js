const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();

const audioDir = path.join(__dirname, 'audios');

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir);
}

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB conectado"))
    .catch(err => console.error("Error MongoDB:", err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true }));

app.use('/audios', express.static(path.join(__dirname, 'audios')));

app.use(express.static(path.join(__dirname, '../frontend')));

// Para que al abrir la raíz te entregue index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});


// Diccionario de palabras
const dictFile = 'dictionary.json';
app.get('/dictionary', (req, res) => {
    if (!fs.existsSync(dictFile)) fs.writeFileSync(dictFile, '{}');
    const dict = JSON.parse(fs.readFileSync(dictFile, 'utf-8'));
    res.json(dict);
});

// Subir palabra
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'audios/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.post('/dictionary', upload.single('audio'), (req, res) => {
    const { word, meaning, example } = req.body;
    if (!word || !meaning || !example) return res.status(400).json({ error: 'Faltan datos' });

    let dict = {};
    if (fs.existsSync(dictFile)) dict = JSON.parse(fs.readFileSync(dictFile, 'utf-8'));

    dict[word.toLowerCase()] = { meaning, example, audio: req.file ? req.file.filename : null };
    fs.writeFileSync(dictFile, JSON.stringify(dict, null, 2));

    res.json({ success: true });
});

// ===== Guardar saludo por idioma =====
app.post('/greeting/:lang', upload.single('audio'), (req, res) => {
    const { lang } = req.params;

    if (!req.file) {
        return res.status(400).json({ error: "No se envió audio" });
    }

    const greetingPath = path.join(__dirname, 'audios', `greeting-${lang}.webm`);

    fs.renameSync(req.file.path, greetingPath);

    res.json({ success: true });
});

// ===== Obtener saludo por idioma =====
app.get('/greeting/:lang', (req, res) => {
    const { lang } = req.params;
    const greetingPath = path.join(__dirname, 'audios', `greeting-${lang}.webm`);

    if (fs.existsSync(greetingPath)) {
        res.sendFile(greetingPath);
    } else {
        res.status(404).json({ error: "No hay saludo grabado" });
    }
});

// Textos (cuadros)
const textsFile = 'texts.json';
app.get('/texts', (req, res) => {
    if (!fs.existsSync(textsFile)) fs.writeFileSync(textsFile, '[]');
    const texts = JSON.parse(fs.readFileSync(textsFile, 'utf-8'));
    res.json(texts);
});

const uploadTextAudio = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'audios/'),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    })
});

app.post('/texts', uploadTextAudio.single('audio'), (req, res) => {
    console.log("body:", req.body);
    console.log("file:", req.file);

    const { id, lang, content } = req.body;

    if (!lang) return res.status(400).json({ error: 'Falta idioma' });

    let texts = [];
    if (fs.existsSync(textsFile)) {
        texts = JSON.parse(fs.readFileSync(textsFile, 'utf-8'));
    }

    let audioFile = null;
    if (req.file) {
        audioFile = req.file.filename;
    }

    if (id) {
        const index = texts.findIndex(t => t.id == id);
        if (index !== -1) {
            texts[index].content = content;
            if (audioFile) texts[index].audio = audioFile;
        }
    } else {
        const newId = Date.now();
        texts.push({
            id: newId,
            lang,
            content: content || "",
            audio: audioFile
        });
    }

    fs.writeFileSync(textsFile, JSON.stringify(texts, null, 2));
    res.json({ success: true });
});

// ===== Agregar palabra a un cuadro =====
app.post('/texts/:id/words', upload.single('audio'), (req, res) => {
    const { id } = req.params;

    let texts = [];
    if (fs.existsSync(textsFile)) {
        texts = JSON.parse(fs.readFileSync(textsFile, 'utf-8'));
    }

    const textIndex = texts.findIndex(t => t.id == id);
    if (textIndex === -1) {
        return res.status(404).json({ error: "Cuadro no encontrado" });
    }

    let audioFileName = null;
    if (req.file) {
        audioFileName = req.file.filename;
    }

    const newWord = {
        text: req.body.word,
        meaning: req.body.meaning,
        example: req.body.example,
        challenge: req.body.challenge,
        audio: audioFileName,
        color: req.body.color || '#ffff00' // 
    };

    if (!texts[textIndex].words) {
        texts[textIndex].words = [];
    }

    texts[textIndex].words.push(newWord);

    fs.writeFileSync(textsFile, JSON.stringify(texts, null, 2));

    res.json({ success: true, word: newWord });
});

// ===== Eliminar un cuadro =====
app.delete('/texts/:id', (req, res) => {
    const { id } = req.params;

    let texts = [];
    if (fs.existsSync(textsFile)) {
        texts = JSON.parse(fs.readFileSync(textsFile, 'utf-8'));
    }

    const textIndex = texts.findIndex(t => t.id == id);

    if (textIndex === -1) {
        return res.status(404).json({ error: "No encontrado" });
    }

    // Si tiene audio, borramos el archivo físico
    const audioFile = texts[textIndex].audio;
    if (audioFile) {
        const audioPath = path.join(__dirname, 'audios', audioFile);
        if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
        }
    }

    // Eliminamos el cuadro del array
    texts.splice(textIndex, 1);

    fs.writeFileSync(textsFile, JSON.stringify(texts, null, 2));

    res.json({ success: true });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));