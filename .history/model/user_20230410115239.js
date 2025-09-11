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
    filename: {
        required: true,
        type: String,
    },
   
    createdAt: {
        default: Date.now(),
        type: Date,
    },
})

const Users = mongoose.model("user", UserSchema);
module.exports = Users;
