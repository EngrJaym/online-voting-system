const express = require('express');
const router = express.Router();
const path = require('path');
const moment = require('moment-timezone');
const Election = require('../models/election');

router.get('/dashboard', async (req, res) => {
    if (req.session.user) {
        const { firstName, lastName, email } = req.session.user;
        const CapsFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        const CapsLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();

        const elections = await Election.find({ creator: email });

        res.render('adminDashboard', { firstName: CapsFirstName, lastName: CapsLastName, elections: elections });
    }
    else {
        res.redirect('/');
    }
});

router.get('/logout', (req, res) => {
    // Destroy session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        } else {
            console.log('Logged out successfully.');
            res.redirect('/');
        }
    });
});


router.post('/config', (req, res) => {
    try {
        res.send(req.body);
    } catch (error) {
        console.log(error)
    }
})

router.get('/createElection', (req, res) => {
    res.render('electionConfig');
});

router.post('/createElection', async (req, res) => {
    const { startDate, endDate, electionTitle } = req.body;
    let currDate = moment().tz('Asia/Manila');
    let startDateTZ = moment.tz(startDate, 'Asia/Manila');
    let endDateTZ = moment.tz(endDate, 'Asia/Manila');
    if (startDateTZ.isBefore(currDate)) {
        res.status(402).send('Invalid start date. Start date cannot be in the past.');
        return
    }
    if (endDateTZ.isBefore(currDate)) {
        res.status(402).send('Invalid end date. End date cannot be in the past.');
        return
    }
    if (endDateTZ.isBefore(startDateTZ)) {
        res.status(402).send('Invalid end date. End date cannot be before start date.');
        return
    }
    else {
        try {
            let creatorEmail = req.session.user.email;
            const newElection = await Election.create({ electionTitle: electionTitle, startDate: startDateTZ, endDate: endDateTZ, creator: creatorEmail });
            res.redirect('/admin/dashboard');
        } catch (error) {
            console.error("Error creating election: ", error);
            res.status(500).send("Error creating election: ", error);
        }
    }
});

module.exports = router;