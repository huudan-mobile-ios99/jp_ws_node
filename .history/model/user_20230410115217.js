var mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
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

const Images = mongoose.model("image", ImageSchema);
module.exports = Images;
