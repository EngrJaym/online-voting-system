const express = require('express');
const router = express.Router();
const User = require('../models/users');

const homeController = require('../controllers/homeController');
router.get('/', homeController.showHomepage)

router.get('/signup', homeController.showSignupPage)
router.post('/signup', async (req, res) => {
    const { username, email, password, confirmPassword, firstName, middleName, lastName, contactNo,
        houseNo, subdivision, barangay, municipality, province, validId, selfieWithValidId} = req.body;
    
     console.log(req.body);
    let errors = [];
    const existingUsername = await User.findOne({username: username});
    const existingEmail = await User.findOne({email: email});
    const existingContact = await User.findOne({contactNo: contactNo});
    const existingName = await User.findOne({firstName: firstName, middleName: middleName, lastName: lastName});
    if (existingUsername) {
        errors.push({msg: 'Username already in use'})
    }
    if (existingEmail) {
        errors.push({msg: 'Email address already in use'})
    }
    if (existingName) {
        errors.push({msg: 'User with this name already has an account'})
    }
    if (existingContact) {
        errors.push({msg: 'Contact already in use'})
    }
    if (password !== confirmPassword) {
        errors.push({msg: 'Passwords do not match'})
    }
    if (errors.length === 0){
        try {
            const newUser = await User.create({username: username, email: email, password: password, confirmPassword: confirmPassword,
                 firstName: firstName, middleName: middleName, lastName: lastName, contactNo: contactNo, houseNo: houseNo, subdivision: subdivision, barangay: barangay, municipality: municipality, province: province});
                 res.status(201).send('User successfully registered.')
        } catch (error) {
            console.error("Error creating user: ",error);
            res.status(500).send('Error creating User.', error);
        }
    }else{
        console.log(errors);
        res.status(500).send("Validation Error found");
    }
    
})
router.get('/login', homeController.showLoginPage)
router.get('/electionconfig', homeController.showElectionConfig)
module.exports = router;