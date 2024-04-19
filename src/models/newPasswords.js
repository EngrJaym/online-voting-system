const mongoose = require('mongoose');
const newPasswordSchema = new mongoose.Schema({
    voterId: {
        type: String,
        required: true
    },
    newPassword: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    numberOfRequests: {
        type: Number
    }
})

const newPasswordModel = mongoose.model('NewPasswords', newPasswordSchema, 'NewPasswords');
module.exports = newPasswordModel;