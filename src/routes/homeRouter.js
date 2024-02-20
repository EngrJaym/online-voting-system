const express = require('express');
const router = express.Router();
const User = require('../models/users');
const bcrypt = require('bcrypt');

const homeController = require('../controllers/homeController');
router.get('/', homeController.showHomepage)

router.get('/signup', homeController.showSignupPage)
router.post('/signup/admin', async (req, res) => {
    const { email, password, confirmPassword, firstName, middleName, lastName, organization } = req.body;
    const existingName = await User.findOne({ firstName: firstName, middleName: middleName, lastName: lastName });
    const existingEmail = await User.findOne({ email: email });
    const userType = 'admin';
    console.log(req.body);
    let errors = [];

    if (existingName) {
        errors.push({ msg: 'User already registered' })
    }
    if (existingEmail) {
        errors.push({ msg: 'Email address already in use' })
    }
    if (password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters' })
    }
    if (password !== confirmPassword) {
        errors.push({ msg: 'Passwords do not match' })
    }
    if (errors.length === 0) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await User.create({
                email: email, password: hashedPassword,
                firstName: firstName, middleName: middleName, lastName: lastName, organization: organization, userType: userType
            });
            res.status(201).send('User successfully registered.')
        } catch (error) {
            console.error("Error creating user: ", error);
            res.status(500).send('Error creating User.', error);
        }
    } else {
        console.log(errors);
        res.status(400);
        res.render('signup', {
            errors, email, firstName, middleName, lastName, organization
        });
    }

})
router.get('/login', homeController.showLoginPage)

router.post('/login', async (req, res) => {
    let { email, password, userType } = req.body
    let existingUser = await User.findOne({ email: email, userType: userType });

    if (existingUser) {
        let passed = await bcrypt.compare(password, existingUser.password);
        if (passed) {
            if (userType === 'admin') {
                res.send('Logged in as Admin.');
            }
            else {
                res.send('Logged in as Voter.');
            }
        }
    }
    else {
        res.send("Account doesnt exist.");
    }

});
router.get('/electionconfig', homeController.showElectionConfig)
module.exports = router;