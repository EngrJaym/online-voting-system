const express = require('express');
const router = express.Router();
const path = require('path');
const moment = require('moment-timezone');
const Election = require('../models/election');
const Ballot = require('../models/ballot');

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


router.get('/createElection', (req, res) => {
    res.render('electionTitle');
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
            const newElection = await Election.create({ electionTitle: electionTitle, startDate: startDate, endDate: endDate, creator: creatorEmail });
            res.render('electionConfig', {electionTitle: electionTitle, startDate: startDate, endDate: endDate});
        } catch (error) {
            console.error("Error creating election: ", error);
            res.status(500).send("Error creating election: ", error);
        }
    }
});

router.get('/editBallot', async (req, res) => {
    const electionTitle = req.query.electionTitle;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;
    let currElection = await Election.find({electionTitle: electionTitle, startDate: startDate, endDate: endDate, creator: req.session.user.email});
    res.render('ballotConfig', {electionTitle: electionTitle, startDate: startDate, endDate: endDate});
});
 
router.post('/editBallot', async (req, res) => {
    const { position } = req.body;
    const electionTitle = req.query.electionTitle;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;
    console.log("BODY REQUEST: ",position);
    const currElection = await Election.findOne({electionTitle: electionTitle, startDate: startDate, endDate: endDate, creator: req.session.user.email});
    console.log("NEW ELECTION: ",currElection);

    if (currElection){
    position.forEach(async function (pos){
        const newBallot = await Ballot.create({position: pos.title, candidates: pos.candidates, creator: req.session.user.email});
        await Election.findByIdAndUpdate(currElection._id, { $push: { ballots: newBallot._id } }, { new: true });
    })
};
    async function showBallots() {
        console.log('LIST OF BALLOTS: ');
        for (let ballotID of currElection.ballots){
            let ballotObject = await Ballot.findById(ballotID);
            console.log(ballotObject);
        };
    };

    showBallots();

    res.render('electionConfig', { position: position, electionTitle: electionTitle, startDate: startDate, endDate: endDate });
});
module.exports = router;