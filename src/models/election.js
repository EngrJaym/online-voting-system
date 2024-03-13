const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema({
    electionTitle: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: 
    {
        type: Date,
        required: true
    },
    ballots: {
        type: [{type: mongoose.Schema.Types.ObjectId, ref: 'Ballot'}]
    },
    voters:{
        type: [{type: mongoose.Schema.Types.ObjectId, ref: 'Voters'}]
    },
    creator:{
        type: String,
        required: true
    }

})

const electionModel = mongoose.model('Election', electionSchema, 'Elections');
module.exports = electionModel;