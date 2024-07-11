const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalname: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    pageCount: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const File = mongoose.model('File', fileSchema);

module.exports = File;