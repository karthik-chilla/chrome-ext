const mongoose = require("mongoose");

const summarySchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  domain: String,
  title: String,
  text: { type: String },
  shortSummary: String,
  longSummary: String,
  lastAccessed: { type: Date, default: Date.now },
  tags: { type: [String], default: [] },
});

const Summary = mongoose.model("Summary", summarySchema);

module.exports = Summary;
