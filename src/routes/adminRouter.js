const express = require('express');
const router = express.Router();
const path = require('path');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const moment = require('moment-timezone');
const Election = require('../models/election');
const { Ballot } = require('../models/ballot');
const Voters = require('../models/voters');
const { start } = require('repl');

router.get('/dashboard', async (req, res) => {
    if (req.session.user) {
        const { firstName, lastName, email } = req.session.user;
        const CapsFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        const CapsLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();

        const elections = await Election.find({ creator: email });
        res.render('adminDashboard', { firstName: CapsFirstName, lastName: CapsLastName, elections });
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


router.get('/createElection', async (req, res) => {
    let creatorEmail = req.session.user.email;
    res.render('electionTitle', { exists: false });

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
            const exists = req.query.exists;
            console.log(exists)
            if (exists == 'true') {
                console.log('update')
                console.log(electionTitle);
                await Election.findByIdAndUpdate(req.query.electionId, { electionTitle: electionTitle, startDate: startDate, endDate: endDate });
                const updatedElection = await Election.findById(req.query.electionId);
                const existingElectionBallots = await Ballot.find({ _id: { $in: updatedElection.ballots } });
                const existingElectionVotersList = await Voters.find({ _id: { $in: updatedElection.voters } });
                res.render('electionConfig', { electionTitle: updatedElection.electionTitle, startDate: updatedElection.startDate, endDate: updatedElection.endDate, electionId: updatedElection._id, electionVoters: existingElectionVotersList, ballots: existingElectionBallots });
            } else {
                console.log('create')
                const newElection = await Election.create({ electionTitle: electionTitle, startDate: startDate, endDate: endDate, creator: creatorEmail });
                const newElectionBallots = await Ballot.find({ _id: { $in: newElection.ballots } });
                res.render('electionConfig', { electionTitle: newElection.electionTitle, startDate: newElection.startDate, endDate: newElection.endDate, electionId: newElection._id, electionVoters: newElection.voters, ballots: newElectionBallots });
            }
        } catch (error) {
            console.error("Error creating election: ", error);
            res.status(500).send("Error creating election: ", error);
        }
    }
});

router.get('/updateElection', async (req, res) => {
    let creatorEmail = req.session.user.email;
    let electionTitle = req.query.electionTitle;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;
    let electionId = req.query.electionId;
    const currElection = await Election.findById(electionId);
    const newElectionBallots = await Ballot.find({ _id: { $in: currElection.ballots } });
    const newElectionVotersList = await Voters.find({ _id: { $in: currElection.voters } });
    res.render('electionConfig', { electionTitle, startDate, endDate, electionId, electionVoters: newElectionVotersList, ballots: newElectionBallots });
});

router.get('/editElectionTitle', (req, res) => {
    res.render('electionTitle', { electionTitle: req.query.electionTitle, startDate: req.query.startDate, endDate: req.query.endDate, electionId: req.query.electionId, exists: true });
});

router.get('/deleteElection', async (req, res) => {
    let electionId = req.query.electionId;
    const currElection = await Election.findById(electionId);
    for (ballotId of currElection.ballots) {
        await Ballot.findByIdAndDelete(ballotId);
    }
    await Election.findByIdAndDelete(currElection._id);
    console.log('Election successfully deleted.');
    res.redirect('/admin/dashboard');

})

router.get('/editBallot', async (req, res) => {
    const electionTitle = req.query.electionTitle;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;
    let currElection = await Election.findById(req.query.electionId);
    res.render('ballotConfig', { electionTitle: electionTitle, startDate: startDate, endDate: endDate, electionId: currElection._id });
});

router.post('/editBallot', async (req, res) => {
    const position = req.body.position;
    console.log(position);
    const electionTitle = req.query.electionTitle;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;
    const currElection = await Election.findById(req.query.electionId);
    for (pos of position) {
        const newBallot = await Ballot.create({ position: pos.title, candidates: pos.candidates, creator: req.session.user.email });
        currElection.ballots.push(newBallot._id);
    }
    currElection.save();
    console.log('Ballot successfully added.')
    const newElectionBallots = await Ballot.find({ _id: { $in: currElection.ballots } });
    const newElectionVotersList = await Voters.find({ _id: { $in: currElection.voters } });
    res.render('electionConfig', { position: position, electionTitle: electionTitle, startDate: startDate, endDate: endDate, electionVoters: newElectionVotersList, electionId: currElection._id, ballots: newElectionBallots });
});

router.get('/deleteBallot', async (req, res) => {
    const ballotId = req.query.ballotId;

    const currElection = await Election.findById(req.query.electionId);
    const index = currElection.ballots.indexOf(ballotId);
    if (index !== -1) {
        currElection.ballots.splice(index, 1);
        currElection.save();
    }
    await Ballot.findByIdAndDelete(ballotId);
    const newElectionBallots = await Ballot.find({ _id: { $in: currElection.ballots } });
    const newElectionVotersList = await Voters.find({ _id: { $in: currElection.voters } });
    console.log(newElectionVotersList);
    res.render('electionConfig', { electionTitle: currElection.electionTitle, startDate: currElection.startDate, endDate: currElection.endDate, electionId: req.query.electionId, electionVoters: newElectionVotersList, ballots: newElectionBallots });
})

router.post('/registerVoters', async (req, res) => {
    let errors = [];
    let creatorEmail = req.session.user.email;
    const students = req.body.voterInfos.split('\r\n');
    for (let student of students) {
        let studentEmail = student.split(',')[5];
        let studentCaps = student.toUpperCase();
        let studentInfo = studentCaps.split(',');
        let studentNumber = studentInfo[0];
        let studentSurname = studentInfo[3];
        let studentFirstname = studentInfo[1];
        let studentMiddlename = studentInfo[2];
        let studentProgram = studentInfo[4];
        const existingVoter = await Voters.findOne({ studentNumber: studentNumber });
        try {
            if (!existingVoter) {
                const existingEmail = await Voters.findOne({ email: studentEmail });
                if (existingEmail) {
                    errors.push({ msg: `${studentEmail} is already in use.` })
                } else {
                    function generateRandomString(length) {
                        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                        let result = '';
                        for (let i = 0; i < length; i++) {
                            result += characters.charAt(Math.floor(Math.random() * characters.length));
                        }
                        return result;
                    }
                    function validateEmail(email) {
                        // Regular expression pattern for validating email addresses
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        return emailRegex.test(email);
                    }
                    if (validateEmail(studentEmail)) {
                        const tempPassword = generateRandomString(8);
                        console.log(tempPassword)
                        const hashedPassword = await bcrypt.hash(tempPassword, 10);
                        console.log(hashedPassword)
                        const newVoter = await Voters.create({ studentNumber: studentNumber, lastName: studentSurname, firstName: studentFirstname, middleName: studentMiddlename, program: studentProgram, email: studentEmail, password: hashedPassword, creator: creatorEmail });

                        var transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: 'ocampojaym@gmail.com',
                                pass: 'stqo ksjm molq mvou'
                            }
                        });

                        var mailOptions = {
                            from: 'ocampojaym@gmail.com',
                            to: `${newVoter.email}`,
                            subject: 'Welcome to DigiVote - URS Online Voting System!',
                            text: `
                    Dear ${newVoter.firstName} ${newVoter.middleName} ${newVoter.lastName},
                    
                    Welcome to the Voting System! You have successfully registered for an account. Below are your login credentials:
                    
                    - Student Number: ${newVoter.studentNumber}
                    - Temporary Password: ${tempPassword}
                    
                    Please use the following steps to access your account:
                    
                    1. Visit the Voting System login page at www.digivote.urs.edu
                    2. Enter your student number and the temporary password provided above.
                    3. Upon logging in, you will be prompted an option to create a new password.
                    
                    It is important to change your temporary password to a secure password of your choice immediately after logging in for the first time.
                    
                    If you did not request this registration or have any questions, please contact us immediately.
                    
                    Thank you,
                    DigiVote
                    `
                        };

                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log('Email sent: ' + info.response);
                            }
                        });
                    } else {
                        errors.push({ msg: 'Invalid email address. Please enter a valid email address.' })
                    }
                }

            } else {
                errors.push({ msg: `Student Number ${studentNumber} is already registered.` });
            }
        } catch (error) {
            errors.push({ msg: `Invalid input, please try again. ${error}` })
        }
    }
    const registeredVoters = await Voters.find({ creator: creatorEmail });
    res.render('votersPage', { registeredVoters, errors, creatorEmail: req.session.user });
});

router.post('/addVoters', async (req, res) => {
    let errors = [];
    let electionId = req.query.electionId;
    const currElection = await Election.findById(electionId);
    console.log(req.body.studentNumbers);
    const students = req.body.studentNumbers.split('\r\n');
    let countBefore = currElection.voters.length;
    //Parse Student Numbers
    for (let studentNumber of students) {
        console.log(studentNumber);
        const existingVoter = await Voters.findOne({ studentNumber: studentNumber });
        //Check if voter is already registered
        if (existingVoter) {

            console.log('Registered voter found');
            //Check if election voters is empty
            if (currElection.voters.length === 0) {
                currElection.voters.push(existingVoter._id);

            }
            else {
                //Check if student number is already an election voter
                const isInElectionVoters = currElection.voters.map(id => id.toString()).includes(existingVoter._id.toString());
                console.log('Already in Election: ', isInElectionVoters);
                if (isInElectionVoters === false) {
                    currElection.voters.push(existingVoter._id);
                }
                else {
                    errors.push({ msg: `Student Number ${studentNumber} is already in the election.` });
                }
            }
        } else {
            errors.push({ msg: `Student Number ${studentNumber} is not yet registered. Please register the student number first at the dashboard.` });
        }
    }
    currElection.save();
    let countAfter = currElection.voters.length;
    if (countAfter > countBefore) {
        errors.push({ msg: `${countAfter - countBefore} voter/s successfully added to the election.` });
    }
    const newElectionBallots = await Ballot.find({ _id: { $in: currElection.ballots } });
    const newElectionVotersList = await Voters.find({ _id: { $in: currElection.voters } });
    console.log(newElectionVotersList);
    res.render('electionConfig', { electionTitle: currElection.electionTitle, startDate: currElection.startDate, endDate: currElection.endDate, electionId, electionVoters: newElectionVotersList, errors, ballots: newElectionBallots });

});

router.get('/deleteElectionVoter', async (req, res) => {
    const studentNumber = req.query.studentNumber;
    const student = await Voters.findOne({ studentNumber: studentNumber });
    const currElection = await Election.findById(req.query.electionId);
    const index = currElection.voters.indexOf(student._id);
    if (index !== -1) {
        currElection.voters.splice(index, 1);
        currElection.save();
    }
    const newElectionBallots = await Ballot.find({ _id: { $in: currElection.ballots } });
    const newElectionVotersList = await Voters.find({ _id: { $in: currElection.voters } });
    console.log(newElectionVotersList);
    res.render('electionConfig', { electionTitle: currElection.electionTitle, startDate: currElection.startDate, endDate: currElection.endDate, electionId: req.query.electionId, electionVoters: newElectionVotersList, ballots: newElectionBallots });

})


router.get('/manageVoters', async (req, res) => {
    let creatorEmail = req.session.user.email;
    const registeredVoters = await Voters.find({ creator: creatorEmail });
    res.render('votersPage', { registeredVoters, creatorEmail });
});

router.get('/deleteVoter', async (req, res) => {
    const found = await Voters.findByIdAndDelete(req.query.voterId);
    const creatorEmail = req.query.creatorEmail;
    const registeredVoters = await Voters.find({ creator: creatorEmail });
    res.render('votersPage', { registeredVoters, creatorEmail });
})
module.exports = router;