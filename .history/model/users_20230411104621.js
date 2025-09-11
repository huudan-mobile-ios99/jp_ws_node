var mongoose = require('mongoose');

const UserSchemas = new mongoose.Schema({
   ault: () => uuidv4().replace(/\-/g, ""),
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
