"use strict";
const mongoose = require("mongoose");
const AutoIncrementFactory = require("mongoose-sequence");

// const username = "huudanstorage_db_user";
// const password = "VouZvBqdKLuxiVtS";
// const database = "JPDesktop";
// const URL = `mongodb+srv://${username}:${password}@cluster0.qpzcnil.mongodb.net/${database}?retryWrites=true&w=majority&appName=Cluster0`;
// const username = "huudanjr99";
// const password = "YGKIeQOIzbqqB1kb";
// const database = "JPDesktop";
// const URL = `mongodb+srv://${username}:${password}@cluster0.qfxa2ad.mongodb.net/${database}?retryWrites=true&w=majority&appName=Cluster0`;



const username = "lehuudan99";
const password = "iYMlvnLT5GxsNL0f";
const database = "JPDesktop1";
const URL = `mongodb+srv://${username}:${password}@cluster0.ys8vqbz.mongodb.net/${database}?retryWrites=true&w=majority&appName=Cluster0`;


// const username = "LeHuuDan99";
// const password = "3lyIxDXEzwCtzw2i";
// const database = "JPDesktop";
// const URL = `mongodb+srv://${username}:${password}@clustervegas.ym3zd.mongodb.net/${database}?retryWrites=true&w=majority`;

let lastConnectionEvent = Date.now(); // ⏱️ Track last event time
const DB_OPTIONS = {
  serverSelectionTimeoutMS: 30000, // 30s
  socketTimeoutMS: 60000,          // 60s
};
let AutoIncrement;

async function connectDBSUB() {
  try {
    // 👇 ACTUALLY CONNECT TO DATABASE
   const mongooseSub= await mongoose.connect(URL, DB_OPTIONS);
    // 👇 INIT AUTO INCREMENT PLUGIN (after connect)
    console.log("✅ Connected 6:DBSUB");

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

