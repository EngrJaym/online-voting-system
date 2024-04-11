const mongoose = require('mongoose')

const AdminSchema = new mongoose.Schema({

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
    role: {
        type: String,
        required: true
    }
})

const adminModel = mongoose.model('Admin', AdminSchema, 'Administrators');
module.exports = adminModel;