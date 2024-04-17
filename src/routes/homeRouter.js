const express = require('express');
const router = express.Router();
const Admin = require('../models/admin');
const Voter = require('../models/voters');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

function capsAll(str){
    return str.toUpperCase();
}


router.get('/',  (req, res) => {
    res.render('index');
})

router.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'html', 'about.html'));
})

router.get('/signup/admin', (req,res) => {
    res.render('adminSignup');
})

router.post('/signup/admin', async (req, res) => {
    const { regEmail, password, confirmPassword, firstName , middleName, lastName } = req.body;
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
            errors.push({msg: 'User successfully registered! You can now log in'})
            res.render('index', {errors});

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
    let existingAdmin = await Admin.findOne({ email: email});
    let errors = [];
    if (existingAdmin) {
        let passed = await bcrypt.compare(password, existingAdmin.password);
        if (passed) {
                req.session.user = existingAdmin;
                res.redirect('/admin/dashboard');
        }
        else {
            errors.push({ msg: 'Invalid Password' });
            res.render('index', { errors, email});
        }
    }
    else {
        errors.push({ msg: "Account doesn't exist" });
        res.render('index', { errors});
        console.log(errors)
    }

});

router.get('/voter', (req, res) => {
    const error = req.query.error;
    if (error){
        res.render('indexVoter', {errors: [{msg: `${error}`}]});
    }else{
        res.render('indexVoter');
    }
})

router.post('/login/voter',async (req, res) => {

    const { studentNumber, password } = req.body;
    let existingVoter = await Voter.findOne({studentNumber: studentNumber});
    let error = '';
    if (existingVoter){
        let passed = await bcrypt.compare(password, existingVoter.password);
        if (passed){
            req.session.user = existingVoter;
            res.redirect('/voter/dashboard');
        }
        else{
            error = 'Invalid Password';
            res.redirect(`/voter?error=${error}`);
        }
    }else{
        error = "Account doesn't exist";
        res.redirect(`/voter?error=${error}`);
    }
    
});

module.exports = router;