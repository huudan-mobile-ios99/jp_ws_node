// promotionHistoryController.js

const Logins = require('./model/login');
const promotionHistoryModel = require('./model/promotion_history')
const Users = require('./model/users');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const JWT_SECRET_KEY = crypto.randomBytes(32).toString('hex');



class OperationService {
    static async loginJWT(req, res) {
        const { name, pass } = req.body; // Extracting fields from request body
        if (!name || !pass) {
            return res.status(400).json({ error: 'number, name, password are required' });
        }
        try {
            // Check if a user record with the given name and number already exists
            const existingUser = await Users.findOne({ name: name, pass: pass });
            if (existingUser) {
                // Create a JWT token with user information and secret key
                const token = jwt.sign({ name: existingUser.name, id: existingUser._id }, JWT_SECRET_KEY, { expiresIn: '1h' });

                // Return success response with JWT token
                return res.json({ status: true, message: `Login Successful - User:${name}`, token: token });
            } else {
                return res.json({ status: false, message: 'Login un-successful',token: null });
            }
        } catch (e) {
            console.log(e);
        }

    }


    static async listPromotionHistory(req, res) {
        promotionHistoryModel.find(function (err, data) {
            if (err) {
                console.log(err);
            } else {
                if (data == null || data.length == 0) {
                    res.send({ "status": false, "message": "find list promotion history fail", "totalResult": null, "data": data, })
                } else {
                    res.send({ "status": true, "message": "find list promotion history success", "totalResult": data.length, "data": data });
                }
            }
        });
    }

    static async listPromotionHistoryByDates(req, res) {
        const { startDate, endDate } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        try {
            const data = await promotionHistoryModel.find({
                isActive: true,
                dateTime: { $gte: new Date(startDate), $lte: new Date(endDate) }
            });
            if (!data || data.length === 0) {
                return res.json({ status: false, message: 'No active promotions found within specified date range', totalResult: null, data: data });
            }
            return res.json({ status: true, message: 'List of active promotions within date range retrieved successfully', totalResult: data.length, data: data });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to retrieve active promotions from MongoDB' });
        }
    }

    static async listPromotionHistory(req, res) {
        promotionHistoryModel.find().sort({ dateTime: -1 }).exec(function (err, data) {
            if (err) {
                console.log(err);
            } else {
                if (data == null || data.length == 0) {
                    res.send({ "status": false, "message": "find list promotion history fail", "totalResult": null, "data": data, })
                } else {
                    res.send({ "status": true, "message": "find list promotion history success", "totalResult": data.length, "data": data });
                }
            }
        });
    }



    //USER LOGIN COUNT 
    static async createUserRecord(req, res) {
        const { number, name, loginCount, lastUpdate } = req.body; // Extracting fields from request body
        if (!number || !name) {
            return res.status(400).json({ error: 'number, name, loginCount, and lastUpdate are required' });
        }
        try {
            // Check if a user record with the given name and number already exists
            const existingUser = await Logins.findOne({ number: number, name: name });

            if (existingUser) {
                // If user already exists, return an error
                existingUser.loginCount += 1;
                existingUser.lastUpdate = existingUser.newUpdate;
                existingUser.newUpdate = new Date(); // Set newUpdate field to current date
                // Save the updated user record to the database
                const savedUser = await existingUser.save();
                // Return the updated user record
                return res.json({ status: true, message: 'User record updated successfully', data: savedUser });
            }
            // Create a new user record
            const newUser = new Logins({
                number: number,
                name: name,
                loginCount: 0,
                lastUpdate: null,
                newUpdate: new Date() // Set newUpdate field to current date
            });
            // Save the user record to the database
            const savedUser = await newUser.save();
            // Return the saved user record
            return res.json({ status: true, message: 'Logins record created successfully', data: savedUser });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to create Logins record in MongoDB' });
        }
    }


    static async checkUserLogin(req, res) {
        const { name, pass } = req.body; // Extracting fields from request body
        if (!name || !pass) {
            return res.status(400).json({ error: 'number, name, password are required' });
        }
        try {
            // Check if a user record with the given name and number already exists
            const existingUser = await Users.findOne({ name: name, pass: pass });
            if (existingUser) {
                return res.json({ status: true, message: `Login Successful - User:${name}`, });
            } else {
                return res.json({ status: false, message: 'Login un-successful', });

            }
        } catch (e) {
            console.log(e)
        }
    }



    //USER LOGIN COUNT 
    static async createNewUser(req, res) {
        const { name, pass } = req.body; // Extracting fields from request body
        if (!name || !pass) {
            return res.status(400).json({ error: 'number, name, password are required' });
        }
        try {
            // Check if a user record with the given name and number already exists
            const existingUser = await Users.findOne({ name: name, pass: pass });
            if (existingUser) {
                // If user already exists, return an error
                return res.json({ status: false, message: 'User was created, stored in DB ', data: existingUser });
            }
            // Create a new user record
            const newUser = new Users({
                name: name,
                pass: pass,
                lastUpdate: new Date() // Set newUpdate field to current date
            });
            // Save the user record to the database
            const savedUser = await newUser.save();
            // Return the saved user record
            return res.json({ status: true, message: 'User new created successfully', data: savedUser });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to create user new in MongoDB' });
        }
    }
}

module.exports = OperationService;