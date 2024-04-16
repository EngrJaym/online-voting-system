const express = require('express');
const router = express.Router();
const Election = require('../models/election');
const { Ballot, Votes } = require('../models/ballot');
const Voters = require('../models/voters');
const nodemailer = require('nodemailer');

const isVoter = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'voter') {
        return next();
    } else {
        return res.redirect('/');
    }
};

router.use(isVoter);

router.get('/dashboard', async (req, res) => {
    const voter = req.session.user;
    const invitedElections = await Election.find({ voters: { $in: voter._id } });
    const ids = invitedElections.map(election => election._id);
    const votes = await Votes.find({ electionId: { $in: ids }, creator: voter.studentNumber });
    const votedElections = [];
    for (const vote of votes) {
        votedElections.push(vote.electionId);
    }
    const uniqueVotedElections = Array.from(new Set(votedElections));
    res.render('voterDashboard', { voter, invitedElections, votedElections: uniqueVotedElections });
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        } else {
            console.log('Logged out successfully.');
            res.redirect('/');
        }
    });
});

router.get('/vote', async (req, res) => {
    const election = await Election.findById(req.query.electionId);
    const ballots = await Ballot.find({ _id: { $in: election.ballots } });
    res.render('ballotPage', { election, ballots });
});

router.post('/vote', async (req, res) => {

    function generateRandomString(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    var voterEmail = req.session.user.email;
    var voterFullName = req.session.user.firstName + ' ' + req.session.user.middleName + ' ' + req.session.user.lastName;
    const election = await Election.findById(req.query.electionId);
    var electionName = election.electionTitle;
    var otp = generateRandomString(6);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: process.env.GMAIL_EMAIL,
        to: voterEmail,
        subject: 'Vote Verification Code',
        text: `
        Dear ${voterFullName},

        Thank you for participating in the ${electionName}! Your vote is important to us.
        
        To ensure the security and integrity of the voting process, we require you to verify your identity by entering the following verification code:
        
        Verification Code: ${otp}
        
        Please use the above verification code to authenticate your vote. Make sure to keep this code confidential and do not share it with anyone.
        
        Once again, thank you for exercising your right to vote. If you did not vote for this election, please contact us immediately at this email.
        
        Best regards,
        DigiVote`
    };

    transporter.sendMail(mailOptions, async function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
            for (const key in req.body) {
                const vote = await Votes.create({ position: key, candidates: req.body[key], creator: req.session.user.studentNumber, electionId: req.query.electionId + 'NULL', verificationCode: otp });
            }
        }
    })

    res.render('voteVerification', { voterId: req.session.user.studentNumber, electionId: req.query.electionId, errors: [] });
});

router.post('/voteVerification', async (req, res) => {

    const studentNumber = req.query.voterId;
    const election = await Election.findById(req.query.electionId);
    const { otp } = req.body;
    console.log(studentNumber, otp);
    console.log('Comparing code...')
    const votes = await Votes.find({ creator: studentNumber, electionId: req.query.electionId + 'NULL', verificationCode: otp });
    console.log(votes)
    if (votes.length > 0) {
        for (let vote of votes) {
            await Votes.findByIdAndUpdate(vote._id, { electionId: election._id });
        }
        console.log('Verified')
        res.redirect('/voter/dashboard')
    } else {
        console.log('Unverified')
        res.render('voteVerification', { voterId: req.session.user.studentNumber, electionId: req.query.electionId, errors: [{ msg: 'Invalid Authentication Code. Please try again.' }] });
    }

})

router.get('/viewFinalResults', async (req, res) => {
    const election = await Election.findById(req.query.electionId);
    const ballots = await Ballot.find({ _id: { $in: election.ballots } });
    for (const ballot of ballots) {
        console.log(ballot.position, ballot.candidates)
    }
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
    console.log(groupedByCreator)
    const votersCount = (election.voters.length).toFixed(2);
    let voterTurnout = 0;
    for (const key in groupedByCreator) {
        voterTurnout++;
    };
    const voterTurnoutPercentage = ((voterTurnout / votersCount) * 100).toFixed(2);

    let status = req.query.status;
    res.render('votersFinalResults', { election, ballots, results, status, votes: groupedByCreator, votersCount, voterTurnout: voterTurnout.toFixed(2), voterTurnoutPercentage });

})

module.exports = router;