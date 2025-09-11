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
const Excel = require('exceljs');

const logStream = fs.createWriteStream('log.txt', { flags: 'a' });
app.use(morgan('tiny'));
app.use(morgan(':method :url :status :response-time ms - :res[content-length]', { stream: logStream }));
app.use(cors({
    origin: '*'
}));
app.use('/', router);
// Create a server instance
const socketIO = require('socket.io');
const http = require('http');
const server = http.createServer();
const io = socketIO(server);


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
const loginModel = require('./model/login')
const { log } = require('console');
const OperationService = require('./operator');
const Logins = require('./model/login');

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
// Set up a connection event listener

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


app.post("/list_user_record", async (req, res) => {
    loginModel.findOne({ name: req.body.name, number: req.body.number }, async function (err, data) {
        if (err) {
            console.log(err);
        }
        else {
            if (data == null || data.length == 0) {
                res.send({ "status": false, "message": "find list user record   fail", "totalResult": null, "data": null, })
            } else {
                res.send({ "status": true, "message": "find list user record  success", "totalResult": data.length, "data": data });
            }
        }
    });
})

app.post("/create_user_record", async (req, res) => {

    const { name, number } = req.body;

    const newLogin = Logins({
        name: name,
        number: number,
        lastUpdate: null,
        loginCount: 0,
    });
    loginModel.findOne({ name: req.body.name, number: req.body.number }, async function (err, data) {
        if (err) {
            console.log(err);
        }
        else {
            if (data == null || data.length == 0) {
                newLogin.save()
                    .then((result) => {
                        res.status(201).json({ "status": true, message: ' user record  created', data: result });
                    })
                    .catch((error) => {
                        res.status(500).json({ "status": true, message: ' user record fail created', data: null });
                    });
            } else {
                // res.send({ "status": true, "message": "find list user record success - can not create because of duplicate ", "totalResult": data.length, "data": data });
                const filter = { name: data.name,number:data.number,_id:data._id };
                const update = { $set: { loginCount: 1, } };
                const options = { upsert: false };
const body ={
                    id: data._id,
                    name:name,
                    number:number,
                    lastUpdate: Date.now(),
                    loginCount:data.loginCount+1,
                }
                loginModel.updateOne(
                body
                , async function (err, login) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        if (!data) {
                            res.status(404).send({ message: `can not update promotion with id: ${req.body.id}` })
                        } else {
                            res.send({ status: true, message: "update promotion success", data: login });
                        }
                    }
                });
            }
        }
    });
})

//list promotion realtime
app.get('/list_promotion_socket', async (req, res) => {
    promotionModel.find(function (err, data) {
        if (err) {
            console.log(err);
        } else {
            if (data == null || data.length == 0) {
                res.send({ "status": false, "message": "find list promotion fail", "totalResult": null, "data": data, });
            } else {
                // Emit the promotions data to all connected clients
                io.emit('promotions', data);
                res.send({ "status": true, "message": "find list promotion success", "totalResult": data.length, "data": data });
            }
        }
    });
});

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
app.get('/list_promotion_history', OperationService.listPromotionHistory);

//list of promotion history by dates 
app.post('/list_promotion_history_by_dates', OperationService.listPromotionHistoryByDates)
//create user record 
app.post('/create_user_record', OperationService.createUserRecord);
app.post('/create_new_user', OperationService.createNewUser);
app.post('/login_user', OperationService.checkUserLogin);
app.post('/login_user_jwt', OperationService.loginJWT);

app.get('/export_promotion_history', async (req, res) => {
    // Retrieve data from promotionHistoryModel.find() function
    promotionHistoryModel.find(function (err, data) {
        if (err) {
            console.log(err);
            res.send({ "status": false, "message": "Failed to retrieve promotion history data", "totalResult": null, "data": null });
        } else {
            if (data == null || data.length === 0) {
                res.send({ "status": false, "message": "No promotion history found", "totalResult": 0, "data": null });
            } else {
                const workbook = new Excel.Workbook();
                const sheet = workbook.addWorksheet('Sheet1');
                sheet.addRow(["STT", "Number Customer", "Name Customer", "Name Promotion", "Answer", "IsCorrect", "DateTime"]); // Add header row
                data.forEach((item, index) => {
                    const row = sheet.addRow([index + 1, item.number_customer, item.name_customer, item.name_promotion, item.answer, item.isCorrect, item.dateTime]); // Add data rows
                    if (item.isCorrect === true) {
                        row.getCell('F').fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'C6EFCE' } // Set background color to light green
                        };

                    }
                    sheet.addRow([index + 1, item.number_customer, item.name_customer, item.name_promotion, item.answer, item.isCorrect, item.dateTime]); // Add data rows
                });
                const headerRow = sheet.getRow(1);
                const greenAccentColor = { argb: '6EB4F7' };
                ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
                    headerRow.getCell(col).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: greenAccentColor // Set background color to green-accent
                    };
                });
                sheet.getRow(1).height = 25; // Set row height of row 1 to 40
                sheet.getColumn(1).width = 5; // Set column width of column A to 15
                sheet.getColumn(2).width = 15; // Set column width of column B to 10
                sheet.getColumn(3).width = 15; // Set column width of column B to 10
                sheet.getColumn(4).width = 35; // Set column width of column B to 10
                sheet.getColumn(5).width = 10; // Set column width of column B to 10
                sheet.getColumn(6).width = 15; // Set column width of column B to 10
                sheet.getColumn(7).width = 15; // Set column width of column B to 10
                sheet.eachRow((row) => {
                    row.eachCell((cell) => {
                        cell.alignment = { vertical: 'middle', horizontal: 'left' }; // Align text to left and vertically centered
                    });
                });

                const formattedTimestamp = getFormattedTimestamp();
                const randomString = generateRandomString(3); // Generate a random string with length 5
                const excelFileName = `promotion_history_${formattedTimestamp}_${randomString}.xlsx`; // Generate a unique file name
                const excelFolderPath = 'public/excel'; // Replace with your desired folder path for saving the Excel file
                if (!fs.existsSync(excelFolderPath)) {
                    fs.mkdirSync(excelFolderPath, { recursive: true });
                }
                const excelFilePath = path.join(excelFolderPath, excelFileName); // Use an absolute path for the file path
                workbook.xlsx.writeFile(excelFilePath)
                    .then(() => {
                        console.log(`Excel file was saved at: ${excelFilePath}`); // Log the file location
                        res.send({ "status": true, "message": "Promotion history Excel file generated and saved on server", "filePath": excelFileName });
                    })
                    .catch((err) => {
                        console.error(err);
                        res.send({ "status": false, "message": "Failed to generate promotion history Excel file", "filePath": null });
                    });
            }
        }
    });
});

// Endpoint for downloading the Excel file
app.get('/download_promotion_history/:filePath', async (req, res) => {
    const excelFolderPath = 'public/excel'; // Replace with the folder path where the Excel files are saved
    const filePath = path.join(excelFolderPath, req.params.filePath); // Get the file path from the URL parameter
    console.log(filePath)
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        res.send({ "status": false, "message": "File not found" });
    } else {
        // Set the appropriate headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${path.basename(filePath)}`);

        // Read the file and stream it to the response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        // Delete the file after it has been sent
        fileStream.on('end', () => {
            fs.unlinkSync(filePath);
            console.log(`Excel file was deleted: ${filePath}`);
        });
    }
});
//This updated code uses req.params.filePath to get the file path from the URL parameter, and then joins it with the excelFolderPath to construct the full file path for the Excel file. The rest of the code remains the same, which sets the appropriate headers for file download, reads the file and streams it to the response, and deletes the file after it has been sent.










// Function to generate a random string with given length
function generateRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}




function getFormattedTimestamp() {
    const timestamp = new Date().getTime(); // Get current timestamp
    // Format the timestamp
    const dateObj = new Date(timestamp);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    // Create formatted timestamp string
    const formattedTimestamp = `${day}-${month}-${year}_${hours}-${minutes}`;
    return formattedTimestamp;
}







