const express = require('express');
const path = require('path')
const router = express.Router();
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const moment = require('moment-timezone');
const Election = require('../models/election');
const { Ballot, Votes } = require('../models/ballot');
const Voters = require('../models/voters');
const { start } = require('repl');
const xlsx = require('xlsx-populate')
const multer = require('multer')

function removeWhitespace(str) {
    return str.replace(/\s+/g, '');
};

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

const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        return res.redirect('/');
    }
};


const uploads = multer();

router.use(isAdmin);

async function clearNullVotes(electionId) {
    await Votes.find({ electionId: electionId + 'NULL' })
    return
}

router.get('/dashboard', async (req, res) => {
    const { firstName, lastName, email } = req.session.user;
    const CapsFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    const CapsLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();

    const elections = await Election.find({ creator: email });
    res.render('adminDashboard', { firstName: CapsFirstName, lastName: CapsLastName, elections });
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

router.get('/saveElection', async (req, res) => {
    let electionTitle = req.query.electionTitle;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;
    let electionId = req.query.electionId;
    const currElection = await Election.findById(electionId);
    const newElectionBallots = await Ballot.find({ _id: { $in: currElection.ballots } });
    const newElectionVotersList = await Voters.find({ _id: { $in: currElection.voters } });
    console.log(newElectionBallots)
    console.log(newElectionVotersList)
    let errors = [];

    if (newElectionBallots.length === 0 || newElectionVotersList.length === 0){
        if (newElectionBallots.length === 0) {
            errors.push({ msg: 'Election cannot be launched. Election must contain at least one ballot.' });
        }
        if (newElectionVotersList.length === 0) {
            errors.push({ msg: 'Election cannot be launched. Election must contain at least one voter.' });
        }
        res.render('electionConfig', { electionTitle, startDate, endDate, electionId, electionVoters: newElectionVotersList, ballots: newElectionBallots, launchErrors: errors });
    }
     else {
        res.redirect('/admin/dashboard');
    }
});

router.post('/createElection', async (req, res) => {
    const { startDate, endDate, electionTitle } = req.body;
    const startDateObject = new Date(startDate);
    const endDateObject = new Date(endDate);
    const timezoneOffset = 0;
    const startDateUTC = new Date(startDateObject.getTime() + timezoneOffset * 60 * 60 * 1000).toISOString();
    const endDateUTC = new Date(endDateObject.getTime() + timezoneOffset * 60 * 60 * 1000).toISOString();
    console.log(startDate, endDate, startDateUTC, endDateUTC);
    
    const exists = req.query.exists;
    let currDate = moment().tz('Asia/Manila');
    let startDateTZ = moment.tz(startDate, 'Asia/Manila');
    let endDateTZ = moment.tz(endDate, 'Asia/Manila');
    let errors = [];
    if (startDateTZ.isBefore(currDate)) {
        errors.push({ msg: 'Invalid start date. Start date cannot be in the past.' });
    }
    if (endDateTZ.isBefore(currDate)) {
        errors.push({ msg: 'Invalid end date. End date cannot be in the past.' });
    }
    if (endDateTZ.isBefore(startDateTZ)) {
        errors.push({ msg: 'Invalid end date. End date cannot be before start date.' });
    }
    if (errors.length !== 0) {
        console.log(exists, startDate, endDate)
        res.render('electionTitle', { errors, exists, electionTitle, startDate, endDate, electionId: req.query.electionId });
    }
    else {
        try {
            let creatorEmail = req.session.user.email;
            if (exists == 'true') {
                console.log('update');
                await Election.findByIdAndUpdate(req.query.electionId, { electionTitle: electionTitle, startDate: startDateUTC, endDate: endDateUTC });
                const updatedElection = await Election.findById(req.query.electionId);
                const existingElectionBallots = await Ballot.find({ _id: { $in: updatedElection.ballots } });
                const existingElectionVotersList = await Voters.find({ _id: { $in: updatedElection.voters } });
                res.render('electionConfig', { electionTitle: updatedElection.electionTitle, startDate: updatedElection.startDate, endDate: updatedElection.endDate, electionId: updatedElection._id, electionVoters: existingElectionVotersList, ballots: existingElectionBallots });
            } else {
                console.log('create')
                const newElection = await Election.create({ electionTitle: electionTitle, startDate: startDateUTC, endDate: endDateUTC, creator: creatorEmail });
                const newElectionBallots = await Ballot.find({ _id: { $in: newElection.ballots } });
                console.log(newElection.startDate, newElection.endDate)
                res.render('electionConfig', { electionTitle: newElection.electionTitle, startDate: newElection.startDate, endDate: newElection.endDate, electionId: newElection._id, electionVoters: newElection.voters, ballots: newElectionBallots });
            }
        } catch (error) {
            console.error("Error creating election: ", error);
            res.status(500).send("Error creating election: ", error);
        }
    }
});

router.get('/updateElection', async (req, res) => {
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
    clearNullVotes(electionId);
    res.redirect('/admin/dashboard');

});

router.get('/endElection', async (req, res) => {
    let electionId = req.query.electionId;
    const timezoneOffset = 8;
    let endDateObject = new Date();
    const endDateUTC = new Date(endDateObject.getTime() + timezoneOffset * 60 * 60 * 1000).toISOString();
    const currElection = await Election.findByIdAndUpdate(electionId, { endDate: endDateUTC });
    res.redirect('/admin/dashboard');
});

router.get('/editBallot', async (req, res) => {
    const electionTitle = req.query.electionTitle;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;
    let currElection = await Election.findById(req.query.electionId);
    res.render('ballotConfig', { electionTitle: electionTitle, startDate: startDate, endDate: endDate, electionId: currElection._id });
});

router.post('/editBallot', async (req, res) => {
    const position = req.body.position;
    const rawCandidates = req.body.candidates.split('\r\n');
    const candidates = rawCandidates.filter(item => item !== "");
    console.log(req.body, candidates);
    const electionTitle = req.query.electionTitle;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;
    const maxChoices = req.body.maxChoices;
    const currElection = await Election.findById(req.query.electionId);

    const newBallot = await Ballot.create({ position: position, candidates: candidates, maxChoices: maxChoices, creator: req.session.user.email });
    currElection.ballots.push(newBallot._id);

    currElection.save();
    console.log('Ballot successfully added.')
    const newElectionBallots = await Ballot.find({ _id: { $in: currElection.ballots } });
    const newElectionVotersList = await Voters.find({ _id: { $in: currElection.voters } });
    res.render('electionConfig', { position: position, electionTitle: electionTitle, startDate: startDate, endDate: endDate, electionVoters: newElectionVotersList, electionId: currElection._id, ballots: newElectionBallots });
});

router.get('/cancelEditBallot', async (req, res) => {
    let electionTitle = req.query.electionTitle;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;
    let electionId = req.query.electionId;
    const currElection = await Election.findById(electionId);
    const newElectionBallots = await Ballot.find({ _id: { $in: currElection.ballots } });
    const newElectionVotersList = await Voters.find({ _id: { $in: currElection.voters } });
    console.log(newElectionBallots)
    console.log(newElectionVotersList)
    let errors = [];
    res.render('electionConfig', { electionTitle, startDate, endDate, electionId, electionVoters: newElectionVotersList, ballots: newElectionBallots, launchErrors: errors });
})

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
    res.render('electionConfig', { electionTitle: currElection.electionTitle, startDate: currElection.startDate.toISOString(), endDate: currElection.endDate.toISOString(), electionId: req.query.electionId, electionVoters: newElectionVotersList, ballots: newElectionBallots });
})

router.post('/registerVoters', async (req, res) => {
    let errors = [];
    let creatorEmail = req.session.user.email;
    const studentNumber = removeWhitespace(req.body.studentNumber);
    const studentEmail = removeWhitespace(req.body.email);
    const studentFirstname = removeWhitespace(req.body.firstName.toUpperCase());
    const studentMiddlename = removeWhitespace(req.body.middleName.toUpperCase());
    const studentSurname = removeWhitespace(req.body.lastName.toUpperCase());
    const studentProgram = removeWhitespace(req.body.program.toUpperCase());
    const existingVoter = await Voters.findOne({ studentNumber: studentNumber });

    try {
        if (!existingVoter) {
            const existingEmail = await Voters.findOne({ email: studentEmail });
            if (existingEmail) {
                errors.push({ msg: `${studentEmail} is already in use.` })
            } else {

                if (validateEmail(studentEmail)) {
                    const tempPassword = generateRandomString(8);
                    const hashedPassword = await bcrypt.hash(tempPassword, 10);
                    const newVoter = await Voters.create({ studentNumber: studentNumber, lastName: studentSurname, firstName: studentFirstname, middleName: studentMiddlename, program: studentProgram, email: studentEmail, password: hashedPassword, creator: creatorEmail, role: 'voter' });

                    var transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: process.env.GMAIL_EMAIL,
                            pass: process.env.GMAIL_PASSWORD
                        }
                    });

                    var mailOptions = {
                        from: process.env.GMAIL_EMAIL,
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
                    3. Upon logging in, you can change your account's password.
                    
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
                    errors.push({ msg: `Student Number ${newVoter.studentNumber} successfully registered.` });
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

    const registeredVoters = await Voters.find({ creator: creatorEmail });
    res.render('votersRegistration', { registeredVoters, errors, creatorEmail: req.session.user });
});

router.post('/registerVotersBatch', uploads.single('file'), async (req, res) => {
    const uploadedFile = req.file;
    const fileExtension = path.extname(uploadedFile.originalname);
    let errors = []
    var emailUsed = 0;
    var successfullyRegistered = 0;
    var invalidEmail = 0;
    var alreadyRegistered = 0;
    var invalidInput = 0;
    var supportedFileExt = true;

    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        try {
        const workbook = await xlsx.fromDataAsync(uploadedFile.buffer);
        const data = workbook.sheet(0).usedRange().value();
    
        var rowCount = 0;
        for (let row of data) {
            if (rowCount === 0) {
                rowCount++;
                continue
            }
            const studentFirstname = row[0];
            const studentMiddlename = row[1];
            const studentSurname = row[2];
            const studentNumber = row[3].toString();
            const studentProgram = row[4];
            const studentEmail = row[5];
            console.log(studentNumber, studentEmail)
            const existingVoter = await Voters.findOne({ studentNumber: studentNumber });
            try {
                if (!existingVoter) {
                    const existingEmail = await Voters.findOne({ email: studentEmail });
                    if (existingEmail) {
                        emailUsed++;
                    } else {

                        if (validateEmail(studentEmail)) {
                            const tempPassword = generateRandomString(8);
                            const hashedPassword = await bcrypt.hash(tempPassword, 10);
                            const newVoter = await Voters.create({ studentNumber: studentNumber, lastName: studentSurname, firstName: studentFirstname, middleName: studentMiddlename, program: studentProgram, email: studentEmail, password: hashedPassword, creator: req.session.user.email, role: 'voter' });

                            var transporter = nodemailer.createTransport({
                                service: 'gmail',
                                auth: {
                                    user: process.env.GMAIL_EMAIL,
                                    pass: process.env.GMAIL_PASSWORD
                                }
                            });

                            var mailOptions = {
                                from: process.env.GMAIL_EMAIL,
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
                            3. Upon logging in, you can change your account's password.
                            
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
                            successfullyRegistered++;
                        } else {
                            invalidEmail++;
                        }
                    }

                } else {
                    alreadyRegistered++;
                }
            } catch (error) {
                invalidInput++;
            }
            rowCount++;
        }} catch (error){
            console.log('Error batch file')
            errors.push({ msg: "File cannot be parsed due to its improper format. Please make sure you're following the proper format of data on your excel file as stated in the reminders."})
        }
    } else {
        console.log('File extension not supported.')
        supportedFileExt = false;
    }
        
    var totalUnregisteredVoters = emailUsed + invalidEmail + alreadyRegistered + invalidInput;
    if (emailUsed > 0 || invalidEmail > 0 || alreadyRegistered > 0 || invalidInput > 0){
        let msg = `A total of ${totalUnregisteredVoters} entries are not registered due to these possible reasons: used email or student number, invalid email format, or voter is already registered.`
        /*if (emailUsed > 0) {
            msg = msg + ` ${emailUsed} emails are already used.`
        }
        if (invalidEmail > 0){
            msg = msg + ` ${invalidEmail} emails are in invalid format.`
        }
        if (alreadyRegistered > 0){
            msg = msg + ` ${alreadyRegistered} student numbers are already registered.`
        }
        if (invalidInput > 0){
            msg = msg + ` ${invalidInput} interntal errors occured.`
        } */
        errors.push({msg: msg});
        
    }

    if (supportedFileExt === false){
        errors.push({msg: 'File not supported. Please use .xlsx or .xls file extensions only.'})
    }
    if (successfullyRegistered > 0){
        errors.push({msg: `${successfullyRegistered} voters are successfully registered.`})
    }
    
    const registeredVoters = await Voters.find({ creator: req.session.user.email });
    res.render('votersRegistration', { registeredVoters, errors, creatorEmail: req.session.user });
})

router.post('/addVoters', async (req, res) => {
    let errors = [];
    let electionId = req.query.electionId;
    const currElection = await Election.findById(electionId);
    console.log(req.body.studentNumbers);
    const students = req.body.studentNumbers.split('\r\n');
    let countBefore = currElection.voters.length;
    //Parse Student Numbers
    for (let studentNumber of students) {
        const filterStudentNumber = removeWhitespace(studentNumber);
        const existingVoter = await Voters.findOne({ studentNumber: filterStudentNumber });
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
            if (filterStudentNumber.length !== 0) {
                errors.push({ msg: `Student Number ${studentNumber} is not yet registered. Please register the student number first at the dashboard.` });
            }
        }
    }
    currElection.save();
    let countAfter = currElection.voters.length;
    if (countAfter > countBefore) {
        errors.push({ msg: `${countAfter - countBefore} voter/s successfully added to the election.` });
    }
    const newElectionBallots = await Ballot.find({ _id: { $in: currElection.ballots } });
    const newElectionVotersList = await Voters.find({ _id: { $in: currElection.voters } });
    const startDateObject = new Date(currElection.startDate);
    const startDate = startDateObject.toISOString().slice(0,-8);
    const endDateObject = new Date(currElection.endDate);
    const endDate = endDateObject.toISOString().slice(0,-8);
    res.render('electionConfig', { electionTitle: currElection.electionTitle, startDate: startDate, endDate: endDate, electionId, electionVoters: newElectionVotersList, errors, ballots: newElectionBallots });

});

router.post('/addVotersBatch', uploads.single('file'), async (req, res) => {
    const uploadedFile = req.file;
    const fileExtension = path.extname(uploadedFile.originalname);
    let errors = []
    let electionId = req.query.electionId;
    const currElection = await Election.findById(electionId);
    var alreadyInElection = 0;
    var notRegistered = 0;
    var successfullyAdded = 0;

    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        try {
        const workbook = await xlsx.fromDataAsync(uploadedFile.buffer);
        const data = workbook.sheet(0).usedRange().value();
    
        var rowCount = 0;
        for (let row of data) {
            if (rowCount === 0) {
                rowCount++;
                continue
            }
            const studentNumber = row[0].toString();
            const filterStudentNumber = removeWhitespace(studentNumber);
            const existingVoter = await Voters.findOne({ studentNumber: filterStudentNumber });
            if (existingVoter){
                if (currElection.voters.length === 0) {
                    currElection.voters.push(existingVoter._id);
                    successfullyAdded++;
                }
                else {
                    const isInElectionVoters = currElection.voters.map(id => id.toString()).includes(existingVoter._id.toString());
                    console.log('Already in Election: ', isInElectionVoters);
                    if (isInElectionVoters === false) {
                        currElection.voters.push(existingVoter._id);
                        successfullyAdded++;
                    }
                    else {
                        alreadyInElection++;
                    }
                }
            } else {
                if (filterStudentNumber.length !== 0) {
                    notRegistered++;
                    }
            }
        }
        }catch (error){
            errors.push({ msg: "File cannot be parsed due to its improper format. Please make sure you're following the proper format of data on your excel file as stated in the reminders."})
        }
    }else{
        errors.push({msg: 'File not supported. Please use .xlsx or .xls file extensions only.'})
    }
    if (alreadyInElection > 0){
        errors.push({ msg: `${alreadyInElection} voters were already invited in the election. No need to add them anymore.` });
    }
    if (notRegistered > 0){
        errors.push({ msg: `${notRegistered} students are not yet registered. Please register them at the Voters Registration page.` });         
    }
    if (successfullyAdded > 0){
        errors.push({msg: `${successfullyAdded} new voters are successfully invited to this election.`})
    }
    currElection.save();
    const newElectionBallots = await Ballot.find({ _id: { $in: currElection.ballots } });
    const newElectionVotersList = await Voters.find({ _id: { $in: currElection.voters } });
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

router.get('/votersRegistration', (req, res) => {
    res.render('votersRegistration');
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
});

router.get('/viewFinalResults', async (req, res) => {
    const status = req.query.status;
    const election = await Election.findById(req.query.electionId);
    const ballots = await Ballot.find({ _id: { $in: election.ballots } });
    const results = await Votes.aggregate([
        { $match: { electionId: req.query.electionId } },

        { $unwind: "$candidates" },

        {
            $group: {
                _id: { position: "$position", candidate: "$candidates" },
                count: { $sum: 1 }
            }
        },

        {
            $project: {
                _id: 0,
                position: "$_id.position",
                candidate: "$_id.candidate",
                count: 1
            }
        }
    ]);
    const votes = await Votes.find({ electionId: election._id });

    const groupedByCreator = votes.reduce((acc, obj) => {
        const key = obj.creator;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(obj);
        return acc;
    }, {});
    const votersCount = (election.voters.length).toFixed(2);
    let voterTurnout = 0;
    for (const key in groupedByCreator) {
        voterTurnout++;
    };
    const voterTurnoutPercentage = ((voterTurnout / votersCount) * 100).toFixed(2);
    res.render('finalResults', { election, ballots, results, status, votes: groupedByCreator, votersCount, voterTurnout: voterTurnout.toFixed(2), voterTurnoutPercentage });
})

module.exports = router;
