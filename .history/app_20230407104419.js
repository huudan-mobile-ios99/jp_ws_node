var express = require('express')
var body_parser = require('body-parser')
var morgan = require('morgan');
var path = require('path')
var app = express();
var cors = require('cors');
var router = express.Router();
const upload_service = require('./upload_service');
app.use(express.json());
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
app.use(express.urlencoded({ extended: true }));
const crypto = require('crypto');
require("dotenv").config();
const { MongoClient, GridFSBucket } = require("mongodb");
const upload2 = require('./upload')
//log request
// const { v4: uuidv4 } = require('uuid');
const uploadFile = require('./upload')
const moment = require('moment-timezone');
const mime = require('mime-types');
const XLSX = require('xlsx');

app.use(morgan('tiny'));
app.use(cors({
    origin: '*'
}));
app.use('/', router);
var port = process.env.PORT || 8090;

app.listen(port);
console.log('app running at port vegas promotion: ' + port);

//connect mongoDB
var config = require('./config')
config.connectDB()
// config.getDb();

//SWAGGER
const swaggerUi = require("swagger-ui-express"), swaggerDocument = require("./swagger.json");
const promotionModel = require('./model/promotion');
const promotionHistoryModel = require('./model/promotion_history')
const imageModel = require('./model/image');
const c = require('config');

app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);

// const vietnamTime = moment().tz('Asia/Singapore').format();


function generateId(length) {
    const id = crypto.randomBytes(length).toString('hex');
    return typeof id === 'string' ? id : '';
}

//APIs HERE
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        fs.mkdir(dir, { recursive: true }, function (err) {
            if (err) return cb(err);
            cb(null, dir);
        });
    },
    filename: (req, file, cb) => {
        const name = file.originalname.toLowerCase().split(' ').join('_');
        cb(null, Date.now() + '-' + name);
    },
});
const upload = multer({ storage: storage });





app.get('/', function (req, res) {
    console.log("index page");
    res.end('index page - vegas promotion');
})
app.post("/upload_photo", upload_service.uploadFiles);
app.get('/files', upload_service.getListFiles);
app.get("/files/:name", upload_service.download);
// Define a route to download a file by filename
app.get('/file/:filename', async (req, res) => {
    const filename = req.params.filename;
    try {
        const [file] = await config.bucketGlobal.find({ filename }).toArray();
        if (!file) {
            return res.status(404).send('File not found');
        }
        // Set the response headers
        res.set('Content-Type', file.contentType);
        res.set('Content-Length', file.length);

        // Stream the file data to the response
        const downloadStream = config.bucketGlobal.openDownloadStream(file._id);
        downloadStream.pipe(res);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal server error');
    }
});

// Delete file in photos.files by filename 
app.delete('/delete_file/:filename', async (req, res) => {
    const filename = req.params.filename;
    const [file] = await config.bucketGlobal.find({ filename }).toArray();
    // res.json(file)
    if (!file) {
        console.error(`File "${filename}" not found`);
        return res.status(404).send(`File "${filename}" not found`);
    }

      // Delete the file from the database
      await config.bucketGlobal.delete(file._id);
      console.log(`File "${filename}" deleted successfully`);
      return res.status(200).send(`File "${filename}"deleted successfully`);
    // const query = { filename: filetoDelete };
    // try {
    //     config.bucketGlobal.delete(query, (err) => {
    //         if (err) {
    //             console.error(`Failed to delete file "${filetoDelete}": ${err}`);
    //             res.status(500).send(`Failed to delete file"${filetoDelete}"`);
    //         } else {
    //             console.log(`File "${filetoDelete}" deleted successfully`);
    //             res.status(200).send(`File "${filetoDelete}" deleted successfully`);
    //         }
    //     })
    // } catch (error) {
    //     console.error(error);
    //     return res.status(500).send('Internal server error');
    // }
});

//detect minetype of file 
app.get('/mimetype/:filename', (req, res) => {
    const { filename } = req.params;
    const mimeType = mime.lookup(filename);
    if (mimeType) {
        res.send({ mimeType });
    } else {
        res.status(404).send({ message: 'File type not found' });
    }
});

app.delete('/photos/clear', async (req, res) => {
    try {
        await config.bucketGlobal.deleteMany({});
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Error clearing collection data' });
    }
});

app.delete('/delete_duplicate/:filename', async (req, res) => {
    const filename = req.params.filename;
    try {
        const [file] = await config.bucketGlobal.find({ filename }).toArray();
        if (!file) {
            return res.status(404).send('File not found');
        }

        const files = await config.bucketGlobal.find({ md5: file.md5 }).toArray();
        if (files.length < 2) {
            return res.send('No duplicate files found');
        }

        const [originalFile, ...duplicateFiles] = files;

        for (const file of duplicateFiles) {
            await config.bucketGlobal.delete(file._id);
        }

        return res.send(`Duplicate files deleted successfully ${filename}`);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal server error');
    }
});
// This implementation takes a filename as a parameter, finds the file in the GridFS bucket with that filename, and then finds all files with the same md5 hash value. If there are no duplicates, the function returns a message indicating that no duplicates were found. Otherwise, it deletes all but one of the files with the same md5 hash value, keeping the original file intact.


// API endpoint to download a file from GridFS by filename
app.get('/download/:filename', async (req, res) => {
    try {
        const file = await config.getFileByName(req.params.filename);
        if (!file) {
            res.status(404).json({ message: 'File not found' });
            return;
        }
        const downloadStream = config.downloadFileById(file._id);
        res.set('Content-Type', file.contentType);
        res.set('Content-Disposition', `attachment; filename="${file.filename}"`);
        downloadStream.pipe(res);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'An error occurred' });
    }
});

//create promotion using string url already return from file upload
app.post('/create_promotion_image_url', async (req, res) => {
    //VARIABLE
    const id_string = generateId(4);
    const message = 'created new promotion with image string';
    try {
        let promotion = new promotionModel({
            "id": id_string,
            "positionIndex": req.body.positionIndex,
            "title": req.body.title,
            "subtitle": req.body.subtitle,
            "body": req.body.body,
            "category": req.body.category,
            "dateCreated": Date.now(),
            "lastUpdate": Date.now(),
            "answerOption": req.body.answerOption,
            "answer": req.body.answer,
            "image": req.body.image,
            "isActive": req.body.isActive,
            "code": req.body.code
        });
        promotionModel.findOne({ id: promotion.id }, async function (err, data) {
            if (err) {
                console.log(err);
            }
            else {
                if (data != null) {
                    res.send({ "status": false, "message": "fail create promotion with string url", "data": null });
                } else {
                    promotion.save(function (err, data) {
                        if (err) {
                            console.log(err)
                        } else {
                            // console.log(message)
                        }
                    });
                    res.send({ "status": true, "message": message, "data": promotion });
                }
            }
        });
    } catch (error) {
        res.status(500).send({ message: `error ${message} ${error}` });
    }
});


//create promotion using file upload
app.post('/create_promotion_image', async (req, res) => {
    //VARIABLE
    const id_string = generateId(4);
    const message = 'created new promotion';
    let url;
    await uploadFile(req, res);

    if (req.file != undefined) {
        url = `${config.baseUrl + req.file.filename}`
    }
    try {
        let promotion = new promotionModel({
            "id": id_string,
            "positionIndex": req.body.positionIndex,
            "title": req.body.title,
            "subtitle": req.body.subtitle,
            "body": req.body.body,
            "category": req.body.category,
            "dateCreated": Date.now(),
            "lastUpdate": Date.now(),
            "answerOption": req.body.answerOption,
            "answer": req.body.answer,
            "image": url,
            "isActive": req.body.isActive,
            "code": req.body.code
        });
        promotionModel.findOne({ id: promotion.id }, async function (err, data) {
            if (err) {
                console.log(err);
            }
            else {
                if (data != null) {
                    res.send({ "status": false, "message": "fail create promotion", "data": null });
                } else {
                    promotion.save(function (err, data) {
                        if (err) {
                            console.log(err)
                        } else {
                            // console.log(message)
                        }
                    });
                    res.send({ "status": true, "message": message, "data": promotion });
                }
            }
        });
    } catch (error) {
        res.status(500).send({ message: `error ${message} ${error}` });
    }
});
//DEPRECATED
app.post('/create_promotion', async (req, res) => {
    const promotion = new promotionModel(req.body);
    const message = 'created new promotion';
    try {
        promotionModel.findOne({ id: promotion.id }, async function (err, data) {
            if (err) {
                console.log(err);
            }
            else {
                if (data != null) {
                    res.send({ "status": false, "message": "fail create promotion", "data": null });
                } else {
                    promotion.save(function (err, data) {
                        if (err) {
                            console.log(err)
                        } else {
                            // console.log(message)
                        }
                    });
                    res.send({ "status": true, "message": message, "data": promotion });
                }
            }
        });
    } catch (error) {
        res.status(500).send({ message: `error ${message} ${error}` });
    }
})

app.put('/update_promotion_image', async (req, res) => {
    const message = 'updated promotion';

    await uploadFile(req, res);
    let url;
    if (req.file != undefined) {
        url = `${config.baseUrl + req.file.filename}`
    }
    try {
        let promotion = new promotionModel({
            "id": req.body.id,
            "positionIndex": req.body.positionIndex,
            "title": req.body.title,
            "subtitle": req.body.subtitle,
            "body": req.body.body,
            "category": req.body.category,
            "dateCreated": Date.now(),
            "lastUpdate": Date.now(),
            "answerOption": req.body.answerOption,
            "answer": req.body.answer,
            "image": url,
            "isActive": req.body.isActive,
            "code": req.body.code
        });
        //find first
        promotionModel.findOne({ id: promotion.id }, async function (err, data) {
            if (err) console.log(err)
            if (!data) { res.status(404).send({ message: `can not update promotion with id: ${req.body.id}` }) }
            promotionModel.updateOne(
                {
                    id: req.body.id, positionIndex: req.body.positionIndex,
                    category: req.body.category,
                    title: req.body.title, subtitle: req.body.subtitle, category: req.body.subtitle,
                    body: req.body.body, dateCreated: Date.now(), lastUpdate: Date.now(),
                    answerOption: req.body.answerOption,
                    answer: req.body.answer, image: url, code: req.body.code
                }
                , async function (err, data) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        if (!data) {
                            res.status(404).send({ message: `can not update promotion with id: ${req.body.id}` })
                        } else {
                            res.send({ status: true, message: "update promotion success", data: promotion });
                        }
                    }
                });
        })

    } catch (error) {
        res.status(500).send({ message: `error ${message} ${error}` });
    }
});

app.put('/update_promotion_image_url', async (req, res) => {
    const message = 'updated promotion with image'
    try {
        let promotion = new promotionModel({
            "id": req.body.id,
            "positionIndex": req.body.positionIndex,
            "title": req.body.title,
            "subtitle": req.body.subtitle,
            "body": req.body.body,
            "category": req.body.category,
            "dateCreated": Date.now(),
            "lastUpdate": Date.now(),
            "answerOption": req.body.answerOption,
            "answer": req.body.answer,
            "image": req.body.image,
            "isActive": req.body.isActive,
            "code": req.body.code
        });
        //find first
        promotionModel.findOne({ id: promotion.id }, async function (err, data) {
            if (err) console.log(err)
            if (!data) { res.status(404).send({ message: `can not update promotion with id: ${req.body.id}` }) }

            promotionModel.updateOne(
                {
                    positionIndex: req.body.positionIndex,
                    category: req.body.category,
                    title: req.body.title, subtitle: req.body.subtitle, category: req.body.subtitle,
                    body: req.body.body, dateCreated: Date.now(), lastUpdate: Date.now(),
                    answerOption: req.body.answerOption,
                    answer: req.body.answer, image: req.body.image, code: req.body.code
                }
                , async function (err, data) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        if (!data) {
                            res.status(404).send({ message: `can not update promotion with id: ${req.body.id}` })
                        } else {
                            res.json({ status: true, message: "update promotion success", data: promotion });
                        }
                    }
                });
        })

    } catch (error) {
        res.status(500).json({ message: `error ${message} ${error}` });
    }
});
app.put('/update_promotion_status', async (req, res) => {
    const message = 'updated promotion status';
    let promotion = new promotionModel({
        "id": req.body.id,
        "title": req.body.title,
        "lastUpdate": Date.now(),
        "isActive": req.body.isActive,
        "code": req.body.code
    });
    promotionModel.findOne({ id: promotion.id }, async function (err, data) {
        if (err) {
            console.log(err);
        }
        else {
            if (data == null) {
                res.send({ "status": false, "message": "fail find by id promotion", "data": null });
            } else {
                const filter = { id: data.id };
                const update = { $set: { isActive: promotion.isActive, lastUpdate: promotion.lastUpdate } };
                const options = { upsert: true };
                promotionModel.updateOne(filter, update, options, async function (err, data) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        if (!data) {
                            res.status(404).send({ message: `can not update status promotion with id: ${req.body.id}` })
                        } else {
                            res.send({ status: true, message: "update promotion status success", data: data });
                        }
                    }
                })
            }
        }
    });
});

//list of promotion 
app.post('/list_promotion_active', async (req, res) => {
    promotionModel.find({ isActive: req.body.isActive }, async function (err, data) {
        if (err) {
            console.log(err);
        }
        else {
            if (data == null || data.length == 0) {
                res.send({ "status": false, "message": "find list promotion active fail", "totalResult": null, "data": data, })
            } else {
                res.send({ "status": true, "message": "find list promotion active success", "totalResult": data.length, "data": data });
            }
        }
    });
})

//list of promotion active
app.get('/list_promotion', async (req, res) => {
    promotionModel.find(function (err, data) {
        if (err) {
            console.log(err);
        }
        else {
            if (data == null || data.length == 0) {
                res.send({ "status": false, "message": "find list promotion fail", "totalResult": null, "data": data, })
            } else {
                res.send({ "status": true, "message": "find list promotion success", "totalResult": data.length, "data": data });
            }
        }
    });
})

//delete promotion
app.delete('/delete_promotion_id', async (req, res) => {
    const promotion = new promotionModel(req.body);
    promotionModel.remove({ id: promotion.id },
        function (err, data) {
            if (err) {
                console.log(err);
            }
            else {
                res.send({ "status": true, "message": "delete promotion success", "data": data });
            }
        });
})


//create promotion history
app.post('/create_promotion_history', async (req, res) => {
    const promotion_history = new promotionHistoryModel(req.body);
    promotion_history.id = generateId(4);
    promotion_history.dateTime = Date.now();
    const message = 'created new promotion history';
    try {
        promotionHistoryModel.findOne({ id: promotion_history.id }, async function (err, data) {
            if (err) {
                console.log(err);
            }
            else {
                if (data != null) {
                    res.send({ "status": false, "message": "fail create promotion history", "data": null });
                } else {
                    promotion_history.save(function (err, data) {
                        if (err) {
                            console.log(err)
                        } else {
                            // console.log(message)
                        }
                    });
                    res.send({ "status": true, "message": message, "data": promotion_history });
                }
            }
        });
    } catch (error) {
        res.status(500).send({ message: `error ${message} ${error}` });
    }
})


//list of promotion history
app.get('/list_promotion_history', async (req, res) => {
    promotionHistoryModel.find(function (err, data) {
        if (err) {
            console.log(err);
        }
        else {
            if (data == null || data.length == 0) {
                res.send({ "status": false, "message": "find list promotion history fail", "totalResult": null, "data": data, })
            } else {
                res.send({ "status": true, "message": "find list promotion history success", "totalResult": data.length, "data": data });
            }
        }
    });
})



// Define the API endpoint to export promotion history data to Excel
app.get('/export_promotion_history', async (req, res) => {
  promotionHistoryModel.find(function (err, data) {
    if (err) {
      console.log(err);
      res.send({ "status": false, "message": "Failed to fetch promotion history", "totalResult": null, "data": null });
    }
    else {
      if (data == null || data.length == 0) {
        res.send({ "status": false, "message": "No promotion history found", "totalResult": 0, "data": null });
      } else {
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
        const excelFileName = 'promotion_history.xlsx'; // Replace with your desired file name
        XLSX.writeFile(workbook, excelFileName);
        res.download(excelFileName, (err) => {
          if (err) throw err;
          fs.unlinkSync(excelFileName);
        });
        res.send({ "status": true, "message": "Promotion history fetched and exported to Excel", "totalResult": data.length, "data": data });
      }
    }
  });
});







