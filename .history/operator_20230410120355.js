// promotionHistoryController.js

const promotionHistoryModel = require('./model/promotion_history')
const useModel 

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



}

module.exports = OperationService;