var mongoose = require('mongoose');

const UserSchemas = new mongoose.Schema({
   
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

const Users = mongoose.model("users", UserSchemas);
module.exports = Users;
