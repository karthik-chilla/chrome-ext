const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

tagSchema.index({ name: 1, userId: 1 }, { unique: true });

const summarySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  url: { type: String, required: true },
  domain: String,
  title: String,
  text: { type: String },
  shortSummary_gemini: String,
  longSummary_gemini: String,
  shortSummary_gemma: String,
  longSummary_gemma: String,
  shortSummary_llama: String,
  longSummary_llama: String,
  shortSummary_mixtral: String,
  longSummary_mixtral: String,
  lastAccessed: { type: Date, default: Date.now },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag", default: [] }],
});

summarySchema.index({ url: 1, user: 1 }, { unique: true });

const Summary = mongoose.model("Summary", summarySchema);
const Tag = mongoose.model("Tag", tagSchema);

module.exports = { Summary, Tag };
