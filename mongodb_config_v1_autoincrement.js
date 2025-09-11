"use strict";
const mongoose = require("mongoose");
const AutoIncrementFactory = require("mongoose-sequence");
const username = "huudanmobileios99";
 const password = "z9n7lia2WHpZOYqk";
 const database = "JPDesktop";
 const URL = `mongodb+srv://${username}:${password}@cluster0.psx2l8d.mongodb.net/${database}?retryWrites=true&w=majority&appName=Cluster0`;
let lastConnectionEvent = Date.now(); // ⏱️ Track last event time
const DB_OPTIONS = {};


let AutoIncrement;

async function connectDB() {
  try {
    // 👇 ACTUALLY CONNECT TO DATABASE
    await mongoose.connect(URL, DB_OPTIONS);

    // 👇 INIT AUTO INCREMENT PLUGIN (after connect)
    AutoIncrement = AutoIncrementFactory(mongoose);
    logWithTime("✅ Connected to MongoDB JPDesktop SUB");

    // Optional: Start a heartbeat ping
    setInterval(async () => {
      try {
          await mongoose.connection.db.admin().ping();
          console.log("[Heartbeat] MongoDB SUB ping successful");
        } catch (err) {
          console.log("[Heartbeat] MongoDB SUB ping failed:", err.message);
        }
    }, 2.5 * 60 * 1000);

    // Connection lifecycle logs
    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB SUB disconnected. Retrying...");
    });

    mongoose.connection.on("reconnected", () => {
      logWithTime("✅ MongoDB SUB reconnected");
    });

    mongoose.connection.on("error", (err) => {
      console.log("❌ MongoDB SUB connection error:", err.message);
    });
  } catch (err) {
    console.log("❌ MongoDB SUB connection failed:", err.message);
    setTimeout(connectDB, 5000); // Retry after 5 seconds
  }
}

function getAutoIncrement() {
  return AutoIncrement;
}

module.exports = {
  connectDB,
  getAutoIncrement,
};



function logWithTime(message) {
  const now = Date.now();
  const diffSeconds = ((now - lastConnectionEvent) / 1000).toFixed(1);
  console.log(`${message} (+${diffSeconds}s since last event)`);
  lastConnectionEvent = now;
}
