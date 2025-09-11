var mongoose = require('mongoose');
 const uuidv4 = require("uuid");

const UserSchemas = new mongoose.Schema({
    _id: {
        type: String,
        default: () => uuidv4().replace(/\-/g, ""),
    },
    name: {
        required: true,
        type: String,
    },
    pass: {
        required: true,
        type: String,
    },
    lastUpdate: {
        // required:true,
        type: Date,
    },
}, {
    timestamps: true,
    collection: "users",
})

const Users = mongoose.model("users", UserSchemas);
module.exports = Users;
