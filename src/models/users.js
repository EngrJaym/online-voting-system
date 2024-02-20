const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({

    email:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },
    firstName:{
        type: String,
        required: true
    },
    middleName:{
        type: String,
        required: true
    },
    lastName:{
        type: String,
        required: true
    },
    userType:{
        type: String,
        required: true
    },
    organization:{
        type: [String]
    }
})

const userModel = mongoose.model('User', UserSchema, 'Users');
module.exports = userModel;