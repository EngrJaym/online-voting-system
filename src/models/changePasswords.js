const mongoose = require('mongoose');
const changePasswordSchema = new mongoose.Schema({
    studentNumber: {
        type: String,
        required: true
    },
    verificationCode: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

changePasswordSchema.index({createdAt: 1}, {expireAfterSeconds: 300});

const changePasswordModel = mongoose.model('ChangePasswords', changePasswordSchema, 'ChangePasswords');
module.exports = changePasswordModel;