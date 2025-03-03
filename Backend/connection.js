const mongoose = require("mongoose");

async function connectToDb(url) {
  try {
    mongoose.connect(url);
    console.log("Mongodb connection established");
  } catch (err) {
    console.log(err);
  }
}

module.exports = { connectToDb };
