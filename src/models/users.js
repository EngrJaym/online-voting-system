const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    username:{
        type: String,
        required: true
    },
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
    contactNo:{
        type: Number,
        required: true
    },
    houseNo:{
        type: String,
        required: true
    },
    subdivision:{
        type: String,
        required: true
    },
    municipality:{
        type: String,
        required: true
    },
    province:{
        type: String,
        required: true
    }
})

const userModel = mongoose.model('User', UserSchema, 'Users');
module.exports = userModel;