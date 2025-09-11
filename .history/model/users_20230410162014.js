var mongoose = require('mongoose');

const UserSchemas = new mongoose.Schema({
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

const UserSchemas = mongoose.model("login", UserSchemas);
module.exports = UserSchemas;
