//mongodb connection


const mongoose = require('mongoose')
const { MongoClient } = require("mongodb");
const username = "LeHuuDan99";
const password = "3lyIxDXEzwCtzw2i";
const database = "PromotionVegas";
let collection_photo;
const host_imge ='http://192.168.100.57:8088/files/'

const URL = `mongodb+srv://${username}:${password}@clustervegas.ym3zd.mongodb.net/${database}?retryWrites=true&w=majority`;
const connectDB = async () => {
  try {
   
   const db =  await mongoose.connect(
      URL,
      { useNewUrlParser: true, useUnifiedTopology: true, useUnifiedTopology: true }
    )
    console.log(`Connected to mongoDB promotion `);
   
    return db;
  } catch (error) {
    console.log('cannot connect mongoDB promotion')
    process.exit(1)
  }
}



const connectDB2 = async () => {
  try {
    const client = new MongoClient(URL);
    await client.connect()
    console.log('Connected to mongoDB2')
    const dbName = "PromotionVegas";
    
    const db = client.db(dbName);
    return db;
  } catch (e) {
    console.log(e)
    process.exit(0)
  }
}

SUPPRESS_NO_CONFIG_WARNING=true

module.exports = {
  connectDB: connectDB,
  connectDB2: connectDB2,
  URL: URL,
  database: database,
  imgBucket: "photos",
  collection: "PromotionVegas",
  collection_photo:collection_photo,
  baseUrl: host_imge,
  SUPPRESS_NO_CONFIG_WARNING:true
}