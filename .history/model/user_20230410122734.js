var mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    number: {
        required: true,
        type: Number,
    },
    name: {
        required: true,
        type: String,
    },
    loginCount : {
        required: true,
        type:Number,
    },
    lastUpdate: {
        required:true,
        type: Date,
    },
    newUpdate: {
        required:true,
        default: Date.now(),
        type: Date,
    },
})

const Users = mongoose.model("user", UserSchema);
module.exports = Users;
