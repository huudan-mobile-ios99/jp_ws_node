"use strict";
const mongoose = require("mongoose");
const AutoIncrementFactory = require("mongoose-sequence");
const username = "lehuudan99";
const password = "iYMlvnLT5GxsNL0f";
const database = "JPDesktop1";
const URL = `mongodb+srv://${username}:${password}@cluster0.ys8vqbz.mongodb.net/${database}?retryWrites=true&w=majority&appName=Cluster0`;
let lastConnectionEvent = Date.now(); // ⏱️ Track last event time
const DB_OPTIONS = {};
let AutoIncrement;

async function connectDBSUB() {
  try {
    // 👇 ACTUALLY CONNECT TO DATABASE
   const mongooseSub= await mongoose.connect(URL, DB_OPTIONS);
    // 👇 INIT AUTO INCREMENT PLUGIN (after connect)
    console.log("✅ Connected DBSUB");

    // Optional: Start a heartbeat ping
    setInterval(async () => {
      try {
          await mongooseSub.connection.db.admin().ping();
          console.log("MongoDB SUB ping successful");
        } catch (err) {
          console.log("MongoDB SUB ping failed:", err.message);
        }
    }, 25 * 60 * 1000);

    // Connection lifecycle logs
    mongooseSub.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB SUB disconnected. Retrying...");
    });

    mongooseSub.connection.on("reconnected", () => {
      console.log("✅ MongoDB SUB reconnected");
    });

    mongooseSub.connection.on("error", (err) => {
      console.log("❌ MongoDB SUB connection error:", err.message);
    });
  } catch (err) {
    console.log("❌ MongoDB SUB connection failed:", err.message);
    setTimeout(connectDBSUB, 25000); // Retry after 25 seconds
  }
}

function getAutoIncrement() {
  return AutoIncrement;
}

module.exports = {
  connectDBSUB,
  getAutoIncrement,
};

