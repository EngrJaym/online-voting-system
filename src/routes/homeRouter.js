const express = require('express');
const router = express.Router();
const Admin = require('../models/admin');
const Voter = require('../models/voters');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const changePasswords = require('../models/changePasswords');
const nodemailer = require('nodemailer');

function capsAll(str) {
    return str.toUpperCase();
}

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

router.get('/', (req, res) => {
    res.render('index');
})

router.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'html', 'about.html'));
})

router.get('/forgotPassword', (req, res) => {
    res.render('forgotPassword')
})

router.post('/forgotPassword', async (req, res) => {
    const { studentNumber } = req.body;
    const OTP = generateRandomString(6);
    const voter = await Voter.findOne({studentNumber: studentNumber});
    const OTPexists = await changePasswords.findOne({studentNumber: studentNumber});

    if (OTPexists && voter){
        res.render('otpVerification2', {errors: [{msg: 'OTP has already been sent earlier. It is only valid for 5 minutes.'}], voterId: voter._id})
    }else if (voter){
        const newOTP = await changePasswords.create({studentNumber: studentNumber, verificationCode: OTP});
        const newVerificationCode = newOTP.verificationCode;
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_EMAIL,
                pass: process.env.GMAIL_PASSWORD
            }
        });
    
        const mailOptions = {
            from: process.env.GMAIL_EMAIL,
            to: voter.email,
            subject: 'Forgot Password Verification Code',
            text: `
            You recently requested to reset your password. To complete this process, please use the following verification code:

            Verification Code: ${newVerificationCode}

            This code is valid for 5 minutes only. If you did not request a password reset or believe this to be in error, please disregard this email.

            Thank you for your cooperation.

            Best regards,
            DigiVote`
        };
    
        transporter.sendMail(mailOptions, async function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        res.render('otpVerification2', { voterId: voter._id, errors: [{msg: 'New OTP has been sent to email.'}]});
    }else{
        res.render('forgotPassword', {errors: [{msg: "Account with this student number doesn't exist."}]});
    }
    
});

router.post('/otpVerification', async (req, res) => {
    const { inputOTP } = req.body;
    const voterId = req.query.voterId;
    const voter = await Voter.findById(voterId);
    console.log(voter, inputOTP)
    const changePasswordObject = await changePasswords.findOne({studentNumber: voter.studentNumber});
    console.log(changePasswordObject)

    if (changePasswordObject && changePasswordObject.verificationCode === inputOTP){
        res.render('forgotSetPassword', {voterId, changePasswordId: changePasswordObject._id});
    }else{
        res.render('otpVerification2', { voterId: voter._id, errors: [{msg: "Incorrect OTP, please try again. Make sure OTP isn't expired."}]});
    }
    
});

router.post('/forgotSetPassword', async (req, res) => {
    const { newPassword } = req.body;
    const voterId = req.query.voterId;
    const changePasswordId = req.query.changePasswordId;
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await Voter.findByIdAndUpdate(voterId, {password: hashedNewPassword});
    await changePasswords.findByIdAndDelete(changePasswordId);
    const msg = 'Password successfully changed. You can login now.'
    res.redirect(`/voter?error=${msg}`);
})

router.get('/signup/admin', (req, res) => {
    res.render('adminSignup');
})

router.post('/signup/admin', async (req, res) => {
    const { regEmail, password, confirmPassword, firstName, middleName, lastName } = req.body;
    const existingName = await Admin.findOne({ firstName: capsAll(firstName), middleName: capsAll(middleName), lastName: capsAll(lastName) });
    const existingEmail = await Admin.findOne({ email: regEmail });
    const userType = 'admin';
    let registerErrors = [];
    if (existingName) {
        registerErrors.push({ msg: 'User with this name is already registered' })
    }
    if (existingEmail) {
        registerErrors.push({ msg: 'Email address already in use' })
    }
    if (password.length < 6) {
        registerErrors.push({ msg: 'Password must be at least 6 characters' })
    }
    if (password !== confirmPassword) {
        registerErrors.push({ msg: 'Passwords do not match' })
    }

    if (registerErrors.length === 0) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await Admin.create({
                email: regEmail, password: hashedPassword,
                firstName: capsAll(firstName), middleName: capsAll(middleName), lastName: capsAll(lastName), role: 'admin'
            });
            let errors = [];
            errors.push({ msg: 'User successfully registered! You can now log in' })
            res.render('index', { errors });

        } catch (error) {
            console.error("Error creating user: ", error);
            res.status(500).send('Error creating User.', error);
        }

    } else {
        console.log(registerErrors);
        res.status(400);
        res.render('adminSignup', {
            registerErrors, regEmail, firstName, middleName, lastName, signupClicked: true
        });
    }
});

router.post('/login/admin', async (req, res) => {
    let { email, password } = req.body;
    let existingAdmin = await Admin.findOne({ email: email });
    let errors = [];
    if (existingAdmin) {
        let passed = await bcrypt.compare(password, existingAdmin.password);
        if (passed) {
            req.session.user = existingAdmin;
            res.redirect('/admin/dashboard');
        }
        else {
            errors.push({ msg: 'Invalid Password' });
            res.render('index', { errors, email });
        }
    }
    else {
        errors.push({ msg: "Account doesn't exist" });
        res.render('index', { errors });
        console.log(errors)
    }

});

router.get('/voter', (req, res) => {
    const error = req.query.error;
    if (error) {
        res.render('indexVoter', { errors: [{ msg: `${error}` }] });
    } else {
        res.render('indexVoter');
    }
})

router.post('/login/voter', async (req, res) => {

    const { studentNumber, password } = req.body;
    let existingVoter = await Voter.findOne({ studentNumber: studentNumber });
    let error = '';
    if (existingVoter) {
        let passed = await bcrypt.compare(password, existingVoter.password);
        if (passed) {
            req.session.user = existingVoter;
            res.redirect('/voter/dashboard');
        }
        else {
            error = 'Invalid Password';
            res.redirect(`/voter?error=${error}`);
        }
    } else {
        error = "Account doesn't exist";
        res.redirect(`/voter?error=${error}`);
    }

});

module.exports = router;