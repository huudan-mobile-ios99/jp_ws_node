const mongoose = require('mongoose')
const { MongoClient } = require("mongodb");
const username = "LeHuuDan99";
const password = "3lyIxDXEzwCtzw2i";
const imageBucket = 'photos';
const database = "PromotionVegas";
const { GridFSBucket } = require('mongodb');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const host_imge = 'http://192.168.100.57:8088/files/'
const URL = `mongodb+srv://${username}:${password}@clustervegas.ym3zd.mongodb.net/${database}?retryWrites=true&w=majority`;


const connection = mongoose.createConnection(URL);

let bucket;
const bucketGlobal = new MongoClient.GridFSBucket(database, {
  bucketName: imageBucket // replace 'photos' with your collection name
});
let gfs;
connection.once('open', () => {
  // Initialize GridFS stream
  gfs = Grid(connection.db, mongoose.mongo);
  gfs.collection(imageBucket); // Replace 'photos' with the name of your GridFS collection
});
const storage = GridFsStorage({
  url: URL,
  file: (req, file) => {
    return {
      bucketName: imageBucket, // Replace 'photos' with the name of your GridFS collection
      filename: file.originalname,
    };
  },
});
// Create a multer upload object using the storage engine
const upload = multer({ storage });
const downloadFile = (filename, res) => {
  // Find the file in GridFS by filename
  gfs.files.findOne({ filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        message: 'File not found',
      });
    }

    // Create a read stream to stream the file data
    const readstream = gfs.createReadStream({ filename });

    // Set the content type header so the browser knows how to handle the response
    res.set('Content-Type', file.contentType);

    // Stream the file data to the response
    readstream.pipe(res);
  });
};
// This will allow you to reuse the download functionality in other parts of your application by simply calling the downloadFile function with the appropriate filename and response object.





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
  console.log('getDb():Open database');
  const client = await MongoClient.connect(URL, { useUnifiedTopology: true });
  const db = client.db(database);
  bucket = new GridFSBucket(db, {
    bucketName: imageBucket,
  });
  return db;
}


async function getCollectionPhoto() {
  const client = await MongoClient.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = client.db(database);
  const collection = db.collection(imageBucket);
  // console.log('successfull connect photo collection')
  return collection;
}




// Save file to GridFS
async function saveFileToGridFS(file, options) {
  const writeStream = bucket.openUploadStream(file.originalname, options);
  file.stream.pipe(writeStream);
  return new Promise((resolve, reject) => {
    writeStream.on('finish', (result) => {
      resolve(result);
    });
    writeStream.on('error', (error) => {
      reject(error);
    });
  });
}
// Retrieve file from GridFS by filename
async function getFileByName(filename) {
  if (!bucket) {
    throw new Error('Bucket is not initialized');
  }
  try {
    const [file] = await bucket.find({ filename }).toArray();
    return file;
  } catch (err) {
    console.error(`Error while getting file ${filename}: ${err}`);
    return undefined;
  }
}
// Download file from GridFS by file ID
function downloadFileById(id) {
  return bucket.openDownloadStream(id);
}
async function getFile(req, res) {
const filename = req.params.filename;

  try {
    // Find the file in GridFS by filename
    const file = await config.getFileByName(filename);

    if (!file) {
      return res.status(404).send('File not found');
    }

    // Set the response headers
    res.set('Content-Type', file.metadata.contentType);
    res.set('Content-Length', file.length);

    // Stream the file data to the response
    const downloadStream = config.bucket.openDownloadStream(file._id);
    downloadStream.pipe(res);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal server error');
  }
}


module.exports = {
  connectDB: connectDB,
  getDb:getDb,  
  getCollectionPhoto:getCollectionPhoto,
  saveFileToGridFS:saveFileToGridFS,
  getFileByName:getFileByName,
  downloadFileById:downloadFileById,
  URL: URL,
  downloadFile:downloadFile,
  getFile:getFile,
  database: database,
  bucket:bucket,
  imgBucket: imageBucket,
  bucketGlobal:bucketGlobal,
  collection: "PromotionVegas",
  baseUrl: host_imge,
}