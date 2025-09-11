
const mongoose = require('mongoose')
const { MongoClient } = require("mongodb");
const username = "LeHuuDan99";
const password = "3lyIxDXEzwCtzw2i";
const database = "PromotionVegas";

const host_imge = 'http://192.168.100.57:8088/files/'
const URL = `mongodb+srv://${username}:${password}@clustervegas.ym3zd.mongodb.net/${database}?retryWrites=true&w=majority`;
const connectDB = async () => {
  try {
    const connect = await mongoose.connect(
      URL,
      { useNewUrlParser: true, useUnifiedTopology: true, useUnifiedTopology: true }
    )
    console.log(`Connected to mongoDB promotion `);
    return connect;
  } catch (error) {
    console.log('cannot connect mongoDB promotion')
    process.exit(1)
  }
}


const clientConnect = async () => {
  const client = new MongoClient(URL);
  client.connect(err => {
    // Handle any errors
    if (err) {
      console.error(err);
      client.close();
      return;
    }

    // Access a specific database
    const db = client.db(`${database}`);
    return  db.collection('photos.files');
  });
}

async function getCollectionPhoto() {
  const client = await MongoClient.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = client.db(database);
  const collection = db.collection('photos.files');
  return collection;
}



module.exports = {
  connectDB: connectDB,
  clientConnect: clientConnect,
  collection_photo:collection_photo,
  URL: URL,
  database: database,
  imgBucket: "photos",
  collection: "PromotionVegas",
  baseUrl: host_imge,
}