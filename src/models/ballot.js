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
    maxChoices: {
        type: Number,
        required: true
    },
    creator: {
        type: String,
        required: true
    },

});

const votesSchema = new mongoose.Schema({
    electionId: {
        type: String,
        required: true
    },
    position: {
        type: String, 
        required: true
    },
    candidates: {
        type: [String],
        required: true
    },
    creator: {
        type: String,
        required: true
    },
    verificationCode: {
        type: String,
        required: true
    }

});

const Ballot = mongoose.model('Ballot', ballotSchema, 'Ballots');
const Votes = mongoose.model('Votes', votesSchema, 'Votes');
module.exports = {Ballot, Votes};
