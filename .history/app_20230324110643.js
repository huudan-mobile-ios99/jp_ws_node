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

//log request
// const { v4: uuidv4 } = require('uuid');
const uploadFile = require('./upload')
const moment = require('moment-timezone');
app.use(morgan('tiny'));
app.use(cors({
    origin: '*'
}));
app.use('/', router);
var port = process.env.PORT || 8090;
const base_url = 'http://localhost:8090/';
app.listen(port);
console.log('app running at port vegas promotion: ' + port);

//connect mongoDB
var config = require('./config')
config.connectDB()


//SWAGGER
const swaggerUi = require("swagger-ui-express"),
    swaggerDocument = require("./swagger.json");
const promotionModel = require('./model/promotion');
const promotionHistoryModel = require('./model/promotion_history')
const imageModel = require('./model/image');

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

// Use the removeFile and checkFileExists functions to remove a file and check if it exists
// upload_service.removeFile('MKT_167sdfs8853295073_background_JP-removebg.png').then(result => {
//   if (result) {
//     console.log('File deleted successfully');
//   } else {
//     console.log('File does not exist');
//   }
//   return upload_service.checkFileExists('MKT_167sdfs8853295073_background_JP-removebg.png');
// }).then(fileExists => {
//   console.log(`File exists: ${fileExists}`);

// });



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
                            console.log(message)
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
                            console.log(message)
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
app.put('/update_promotion_status', async (req, res) => {
    const message = 'updated promotion status';
    try {
        let promotion = new promotionModel({
            "id": req.body.id,
            "lastUpdate": Date.now(),
            "isActive": req.body.isActive,
        });
        //find first
        console.log(`${promotion.id} ${promotion.lastUpdate} ${promotion.isActive}`)
        try {
            const promo = await promotionModel.findone({ id: req.body.id }, promotion, { new: false },{returnOriginal: false });
            res.json(promo);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    } catch (error) {
        res.status(500).send({ message: `error ${message} ${error}` });
    }
});

//list of promotion 
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
                            console.log(message)
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