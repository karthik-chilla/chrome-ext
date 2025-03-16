const mongoose = require("mongoose");

const SummaryHistorySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['short', 'long'] },
  url: String,
  domain: String
});

const UserSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  name: String,
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },
  picture: String,
  role: {
    type: String,
    enum: ["user", "super_admin"],
    default: "user",
  },
  createdAt: { type: Date, default: Date.now },
  subscription: {
    type: String,
    enum: ["free", "basic", "premium"],
    default: "free",
  },
  lastLogin: { type: Date },
  loginHistory: [
    {
      timestamp: { type: Date, default: Date.now },
      action: String,
      ipAddress: String,
    },
  ],
  paymentHistory: [
    {
      amount: Number,
      date: { type: Date, default: Date.now },
      description: String,
      status: String,
    },
  ],

  summaryCount: { type: Number, default: 0 },
  summaryHistory: [SummaryHistorySchema]
  

}, {
  timestamps: true,
  collection: 'users' // Explicitly set collection name
});

// Create indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ "loginHistory.timestamp": -1 });


module.exports = mongoose.model("User", UserSchema);
