const express = require('express');
const router = express.Router();
const Admin = require('../models/admin');
const Voter = require('../models/voters');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const homeController = require('../controllers/homeController');

function capsAll(str){
    return str.toUpperCase();
}

var signupClicked = false;

router.get('/',  (req, res) => {
    res.render('index', {signupClicked})
})

router.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'html', 'about.html'));
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
                firstName: capsAll(firstName), middleName: capsAll(middleName), lastName: capsAll(lastName), userType: userType
            });
            let errors = [];
            errors.push({msg: 'User successfully registered! You can now log in'})
            res.render('index', {errors, signupClicked});

        } catch (error) {
            console.error("Error creating user: ", error);
            res.status(500).send('Error creating User.', error);
        }

    } else {
        console.log(registerErrors);
        res.status(400);
        res.render('index', {
            registerErrors, regEmail, firstName, middleName, lastName, signupClicked: true
        });
    }
});

router.post('/login/admin', async (req, res) => {
    let { email, password } = req.body;
    let userType = 'admin';
    let existingUser = await Admin.findOne({ email: email, userType: userType });
    let errors = [];
    if (existingUser) {
        let passed = await bcrypt.compare(password, existingUser.password);
        if (passed) {
            if (userType === 'admin') {
                console.log('Logged in as admin...');
                req.session.user = existingUser;
                console.log("User logged in: ", req.session.user);
                res.redirect('/admin/dashboard');

            }
            else {
                res.send('Logged in as Voter.');
            }
        }
        else {
            errors.push({ msg: 'Invalid Password' });
            res.render('index', { errors, email, signupClicked});
        }
    }
    else {
        errors.push({ msg: "Account doesn't exist" });
        res.render('index', { errors, signupClicked});
    }

});

router.get('/voter', (req, res) => {
    res.render('indexVoter');
})

router.post('/login/voter',async (req, res) => {
    const { studentNumber } = req.body;
    let userType = 'voter';
    let existingUser = await Voter.findOne({ email: email, userType: userType });
    let errors = [];
})

router.get('/electionconfig', homeController.showElectionConfig)
module.exports = router;