const { Timestamp } = require('mongodb');
const mongoose = require('mongoose');

const ballotSchema = new mongoose.Schema({
    voterName: {
        type: String, required: true
    },
    candidateName: {
        type: String,
        required: true
    },
    timeStamp: {
        type: Date,
        default: Date.now
    }
});

const Ballot = mongoose.model('Ballot', ballotSchema, 'President');
module.exports = Ballot;
