var mongoose = require('mongoose');

const Users = new mongoose.Schema({
    number: {
        required: true,
        type: Number,
    },
    name: {
        required: true,
        type: String,
    },
    pass : {
        required:true,
        type:String,
    },
    lastUpdate: {
        // required:true,
        type: Date,
    },
   
})

const Users = mongoose.model("login", Users);
module.exports = Users;
