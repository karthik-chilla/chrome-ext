const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: "tags", // Explicitly set collection name
  }
);

tagSchema.index({ name: 1, userId: 1 }, { unique: true });

const summarySchema = new mongoose.Schema(
  {
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
    shortSummary: String,
    longSummary: String,
    aiProvider_short: {
      type: String,
      enum: ["gemini", "gemma", "llama", "qwen32b"],
    },
    aiProvider_long: {
      type: String,
      enum: ["gemini", "gemma", "llama", "qwen32b"],
    },
    lastAccessed: { type: Date, default: Date.now },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag", default: [] }],
    isSaved: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "summaries", // Explicitly set collection name
  }
);

summarySchema.index({ url: 1, user: 1 }, { unique: true });
summarySchema.index({ lastAccessed: -1 });
summarySchema.index({ domain: 1 });
summarySchema.index({ tags: 1 });

const Summary = mongoose.model("Summary", summarySchema);
const Tag = mongoose.model("Tag", tagSchema);

module.exports = { Summary, Tag };
