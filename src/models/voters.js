const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
    studentNumber:{
        type: String,
        required: true,
        unique: true
    },
    firstName:{
        type: String,
        required: true
    },
    middleName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    program: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true
    },
    creator:{
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    }
})

const voterModel = mongoose.model('Voter', voterSchema, 'Voters');
module.exports = voterModel;