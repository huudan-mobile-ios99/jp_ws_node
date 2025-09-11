//IMAGE UPLOAD
const multer = require("multer");
const mongoose = require('mongoose');

const util = require("util");
const { GridFsStorage } = require('multer-gridfs-storage');
const config = require('./config')
var storage = new GridFsStorage({
  url: config.URL,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    const originalname = file.originalname;
    console.log(originalname);
    const match = ["image/png", "image/jpeg", "image/jpg", "image/svg", "image/xml"];
    if (match.indexOf(file.mimetype) === -1) {
      const filename = `MKT_${Date.now()}_${file.originalname}`;
      console.log(`file name: ${filename}`)
      return filename;
    }
    return {
      bucketName: config.imgBucket,
      filename: `MKT_${Date.now()}_${file.originalname}`
    };
  }
});




var uploadFiles = multer({ storage: storage }).single("file");
var uploadFilesMiddleware = util.promisify(uploadFiles);
module.exports = uploadFilesMiddleware
