const mongoose = require("mongoose");

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
    enum: ["user", "admin", "super_admin"],
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
});

module.exports = mongoose.model("User", UserSchema);
