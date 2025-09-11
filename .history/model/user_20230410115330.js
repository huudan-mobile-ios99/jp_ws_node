var mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    caption: {
        required: true,
        type: String,
    },
    fileId: {
        required: true,
        type: String,
    },
    name: {
        required: true,
        type: String,
    },
   
    number: {
        required: true,
        type: Number,
    },
    login
    createdAt: {
        default: Date.now(),
        type: Date,
    },
})

const Users = mongoose.model("user", UserSchema);
module.exports = Users;
