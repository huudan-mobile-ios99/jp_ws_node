const mongoose = require('mongoose');
const PromotionHistorySchema = new mongoose.Schema({
    id:{
        type:String,
    },
    number_customer:{
        type:Number,required:true
    },
    name_customer:{
        type: String,required: true
    },
    name_promotion:{
    type:String,required:true
    },
    answer:{
        type:String,required: true
    },
    isCorrect:{
        type:Boolean,required: true
    },
    dateTime:{
        type: Date
    },
    
})

const PromotionHistory = mongoose.model("promotion_history", PromotionHistorySchema);
module.exports = PromotionHistory;

