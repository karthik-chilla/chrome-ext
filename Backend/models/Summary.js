const mongoose = require("mongoose");

const summarySchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  domain: String,
  title: String,
  shortSummary: String,
  longSummary: String,
  lastAccessed: { type: Date, default: Date.now },
});

const Summary = mongoose.model("Summary", summarySchema);
//added comment
module.exports = Summary;
