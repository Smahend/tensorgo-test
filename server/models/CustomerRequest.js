const mongoose = require('mongoose');

const customerRequestSchema = new mongoose.Schema({
    userId: String,
    category: String,
    comments: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CustomerRequest', customerRequestSchema);
