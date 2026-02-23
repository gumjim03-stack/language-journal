const mongoose = require("mongoose");

const wordSchema = new mongoose.Schema({
  text: String,
  meaning: String,
  example: String,
  challenge: String,
  audio: String,
  color: String
});

const textSchema = new mongoose.Schema({
  lang: String,
  content: String,
  audio: String,
  words: [wordSchema]
});

module.exports = mongoose.model("Text", textSchema);