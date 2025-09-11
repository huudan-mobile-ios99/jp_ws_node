const mongoose = require('mongoose');
const PromotionSchema = new mongoose.Schema({
    id:{
        type:String,
    },
    positionIndex:{
        type:Number,
    },
    title:{
        type: String,required: true
    },
    subtitle:{
        type:String,required: true
    },
    body:{
        type:String,required: true
    },
    category:{
        type:String
    },
    dateCreated:{
        type: Date
    },
    lastUpdate:{
        type:Date,
    },
    answerOption:{
        type:Number,required: true
    },
    answer:{
        type:Number,required: true
    },
    image:{
        type:String,
    },
    isActive:{
        type:Boolean,required:true
    },
    code:{type:String,required:true}
    
})


const Promotion = mongoose.model("promotion", PromotionSchema);
module.exports = Promotion;

