// 1️⃣ TODOS LOS REQUIRE ARRIBA
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const Text = require("./models/Text");

const mongoose = require("mongoose");

const greetingSchema = new mongoose.Schema({
  lang: { type: String, required: true, unique: true },
  audio: { type: String, required: true }
});

const Greeting = mongoose.model("Greeting", greetingSchema);
// 2️⃣ CONFIGURACIÓN DE CLOUDINARY
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

// 3️⃣ CREACIÓN DEL STORAGE
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "language-journal-audios",
    resource_type: "auto"
  }
});

const upload = multer({ storage });

// 4️⃣ DESPUÉS YA CREAS APP
const app = express();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB conectado"))
    .catch(err => console.error("Error MongoDB:", err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get("/texts", async (req, res) => {
  try {
    const texts = await Text.find();
    res.json(texts);
  } catch (error) {
    console.error("Error obteniendo textos:", error);
    res.status(500).json({ error: "Error obteniendo textos" });
  }
});

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


app.post('/dictionary', upload.single('audio'), (req, res) => {
    const { word, meaning, example } = req.body;
    if (!word || !meaning || !example) return res.status(400).json({ error: 'Faltan datos' });

    let dict = {};
    if (fs.existsSync(dictFile)) dict = JSON.parse(fs.readFileSync(dictFile, 'utf-8'));

    dict[word.toLowerCase()] = { meaning, example, audio: req.file ? req.file.file.path : null };
    fs.writeFileSync(dictFile, JSON.stringify(dict, null, 2));

    res.json({ success: true });
});



app.post("/texts", upload.single("audio"), async (req, res) => {
  const { id, lang, content } = req.body;

  if (!lang) return res.status(400).json({ error: "Falta idioma" });

 let audioFile = null;
if (req.file) {
  audioFile = req.file.path;
}

  if (id) {
    await Text.findByIdAndUpdate(id, {
      content,
      ...(audioFile && { audio: audioFile })
    });
  } else {
    await Text.create({
      lang,
      content,
      audio: audioFile,
      words: []
    });
  }

  res.json({ success: true });
});

// ===== Agregar palabra a un cuadro =====
app.post('/texts/:id/words', upload.single('audio'), async (req, res) => {
  const { id } = req.params;

  let audioFileName = req.file ? req.file.path : null;
const newWord = {
    text: req.body.word,
    meaning: req.body.meaning,
    example: req.body.example,
    challenge: req.body.challenge,
    color: req.body.color || "#ffff00",
    audio: req.file ? req.file.path : null
};

  await Text.findByIdAndUpdate(
    id,
    { $push: { words: newWord } },
    { new: true }
  );

  res.json({ success: true, word: newWord });
});

// ===== Eliminar un cuadro =====
// ===== Eliminar un cuadro =====
app.delete('/texts/:id', async (req, res) => {
  try {
    await Text.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error eliminando texto:", error);
    res.status(500).json({ error: "Error eliminando texto" });
  }
});

// ===== Guardar saludo por idioma =====
app.post('/greeting/:lang', upload.single('audio'), async (req, res) => {
  try {
    const { lang } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No audio uploaded" });
    }

    const audioUrl = req.file.path;

    await Greeting.findOneAndUpdate(
      { lang },
      { audio: audioUrl },
      { upsert: true, returnDocument: "after" }
    );

    res.json({ success: true, audio: audioUrl });

  } catch (error) {
    console.error("Error saving greeting:", error);
    res.status(500).json({ error: "Error saving greeting" });
  }
});

app.get('/greeting/:lang', async (req, res) => {
  try {
    const { lang } = req.params;

    const greeting = await Greeting.findOne({ lang });

    if (!greeting) {
      return res.status(404).json({ error: "No greeting found" });
    }

    res.json({ audio: greeting.audio });

  } catch (error) {
    console.error("Error fetching greeting:", error);
    res.status(500).json({ error: "Error fetching greeting" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));