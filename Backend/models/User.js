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
  createdAt: { type: Date, default: Date.now },
  subscription: {
    type: String,
    enum: ['free', 'basic', 'premium'],
    default: 'free'
  },
  paymentHistory: [{
    amount: Number,
    date: { type: Date, default: Date.now },
    description: String,
    status: String
  }]
});

module.exports = mongoose.model("User", UserSchema);