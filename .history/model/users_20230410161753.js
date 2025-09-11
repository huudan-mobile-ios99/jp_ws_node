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
        required: true,
        type:Number,
    },
    lastUpdate: {
        // required:true,
        type: Date,
    },
   
})

const Logins = mongoose.model("login", Users);
module.exports = Logins;
