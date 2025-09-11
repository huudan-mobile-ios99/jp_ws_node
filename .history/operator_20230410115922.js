// promotionHistoryController.js

const promotionHistoryModel = require('./'); // Replace with the path to your promotionHistoryModel
const promotionHistoryModel = require('./model/promotion_history')

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
}

module.exports = OperationService;