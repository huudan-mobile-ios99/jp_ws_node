//IMAGE UPLOAD
const multer = require("multer");
const mongoose = require('mongoose');

const util = require("util");
const { GridFsStorage } = require('multer-gridfs-storage');
const config = require('./config')
const currentDate = new Date().toISOString().substring(0, 10)

var storage = new GridFsStorage({
  url: config.URL,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  
  file: (req, file) => {
    const originalname = file.originalname;
    console.log(originalname);
    const match = ["image/png", "image/jpeg", "image/jpg", "image/svg", "image/xml"];
    if (match.indexOf(file.mimetype) === -1) {
      const filename = `MKT_${currentDate}_${file.originalname}`;
      console.log(`file name: ${filename}`)
      return filename;
    }
    return {
      bucketName: config.imgBucket,
      filename: `${currentDate}_${file.originalname}`
    };
  }
});


const storage2= new GridFsStorage({
    url: config.URL,
    options: { useNewUrlParser: true, useUnifiedTopology: true },
    file: (req, file) => {
        const match = ["image/png", "image/jpeg"];

        if (match.indexOf(file.mimetype) === -1) {
            const filename = `${Date.now()}-any-name-${file.originalname}`;
            return filename;
        }

        return {
            bucketName: "images",
            filename: `${Date.now()}-any-name-${file.originalname}`,
        };
    },
});
module.exports = multer({ storage2 });

module.exports = multer({ storage });





var uploadFiles = multer({ storage: storage }).single("file");
var uploadFilesMiddleware = util.promisify(uploadFiles);
module.exports = uploadFilesMiddleware
