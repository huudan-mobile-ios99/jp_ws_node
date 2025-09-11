const mongoose = require('mongoose')
const { MongoClient } = require("mongodb");
const username = "LeHuuDan99";
const password = "3lyIxDXEzwCtzw2i";
const database = "PromotionVegas";
const { GridFSBucket } = require('mongodb');

const host_imge = 'http://192.168.100.57:8088/files/'
const URL = `mongodb+srv://${username}:${password}@clustervegas.ym3zd.mongodb.net/${database}?retryWrites=true&w=majority`;


const connection = mongoose.createConnection(URL);

let gfs;
connection.once('open', () => {
  // Initialize GridFS stream
  gfs = Grid(connection.db, mongoose.mongo);
  gfs.collection('photos'); // Replace 'photos' with the name of your GridFS collection
});

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


async function getDb() {
  const client = await MongoClient.connect(URL, { useUnifiedTopology: true });
  const db = client.db(database);
  return db;
}


async function getCollectionPhoto() {
  const client = await MongoClient.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = client.db(database);
  const collection = db.collection('photos.files');
  // console.log('successfull connect photo collection')
  return collection;
}

async function getFileByName(filename) {
  const db = await getDb();
  const bucket = new GridFSBucket(db, {
    bucketName: 'photos.files'
  });
  const file = await bucket.find({ filename }).toArray();
  return file[0];
}



module.exports = {
  connectDB: connectDB,
  getDb:getDb,  
  getCollectionPhoto:getCollectionPhoto,
  getFileByName:getFileByName,
  URL: URL,
  database: database,
  imgBucket: "photos",
  collection: "PromotionVegas",
  baseUrl: host_imge,
}