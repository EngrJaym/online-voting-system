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
    voters:{
        type: [{type: mongoose.Schema.Types.ObjectId, ref: 'Users'}]
    },
    creator:{
        type: String,
        required: true
    }

})

const electionModel = mongoose.model('Election', electionSchema, 'Elections');
module.exports = electionModel;