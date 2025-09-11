// promotionHistoryController.js

const promotionHistoryModel = require('./model/promotion_history')
const useModel  =require('./model/user')

class OperationService {
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



//USER LOGIN COUNT 

static async createUserRecord(req, res) {
  const { number,loginCount,name } = req.body; // Extracting number and loginCount from request body

  // Validate request body
  if (!number || !loginCount || !name) {
    return res.status(400).json({ error: 'number,name and loginCount are required' });
  }

  try {
    // Create a new user record
    const newUser = new Users({
      number: number,
      loginCount: loginCount,
      name:name,
    });

    // Save the user record to the database
    const savedUser = await newUser.save();

    // Return the saved user record
    return res.json({ status: true, message: 'User record created successfully', data: savedUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create user record in MongoDB' });
  }
}

}

module.exports = OperationService;