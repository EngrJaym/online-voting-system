const { Timestamp } = require('mongodb');
const mongoose = require('mongoose');

const ballotSchema = new mongoose.Schema({
    position: {
        type: String, 
        required: true
    },
    candidates: {
        type: [String],
        required: true
    },
    election: {
        type: String
    },
    creator: {
        type: String,
        required: true
    },

});

const Ballot = mongoose.model('Ballot', ballotSchema, 'Ballots');
module.exports = Ballot;
