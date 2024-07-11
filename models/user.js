const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }]
});

const User = mongoose.model('User', userSchema);

module.exports = User;
