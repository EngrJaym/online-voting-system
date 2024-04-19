const express = require('express');
const router = express.Router();
const Election = require('../models/election');
const { Ballot, Votes } = require('../models/ballot');
const Voters = require('../models/voters');
const nodemailer = require('nodemailer');
const newPasswords = require('../models/newPasswords');
const bcrypt = require('bcrypt');

const isVoter = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'voter') {
        return next();
    } else {
        return res.redirect('/');
    }
};

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

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

    res.render('otpVerification', { voterId: req.session.user.studentNumber, electionId: req.query.electionId, errors: [], type: req.query.type });
});

router.post('/otpVerification', async (req, res) => {

    const { otp } = req.body;
    console.log(req.query.type);
    if (req.query.type === 'vote') {
        const studentNumber = req.query.voterId;
        const election = await Election.findById(req.query.electionId);
        const votes = await Votes.find({ creator: studentNumber, electionId: req.query.electionId + 'NULL', verificationCode: otp });
        if (votes.length > 0) {
            for (let vote of votes) {
                await Votes.findByIdAndUpdate(vote._id, { electionId: election._id });
            }
            console.log('Verified')
            res.redirect('/voter/dashboard')
        } else {
            console.log('Unverified')
            res.render('otpVerification', { voterId: req.session.user.studentNumber,type: 'vote', electionId: req.query.electionId, errors: [{ msg: 'Invalid Authentication Code. Please try again.' }] });
        }
    } else if (req.query.type === 'changePassword') {
        const voterId = req.query.voterId;
        const newPasswordId = req.query.newPasswordId;
        const newPassword = await newPasswords.findById(newPasswordId);
        console.log(newPasswordId, newPassword.otp, otp)
        if (otp === newPassword.otp) {
            await Voters.findByIdAndUpdate(voterId, { password: newPassword.newPassword });
            const otpTrash = await newPasswords.find({voterId: voterId});
            console.log(otpTrash)
            for (const otp of otpTrash){
                await newPasswords.findByIdAndDelete(otp._id);
            };
            console.log('correct otp');
            let error = 'Password successfully changed. Please login again.'
            res.redirect(`/voter?error=${error}`);
        } else {
            console.log('Wrong otp');
            res.render('otpVerification', { voterId: voterId, type: 'changePassword', newPasswordId: newPasswordId, electionId: 'NULL', errors: [{msg: 'Invalid Authentication Code. Please try again.'}] });
        }
    } else {
        console.log('No type');
        res.redirect('/')
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

});

router.get('/changePassword', (req, res) => {
    console.log(req.session.user._id);
    res.render('changePassword', { voterId: req.session.user._id });
});

router.post('/changePassword', async (req, res) => {
    const { currPassword, newPassword } = req.body;
    var otp = generateRandomString(6);
    const voter = await Voters.findById(req.query.voterId);
    const correctCurrPassword = await bcrypt.compare(currPassword, voter.password);
    let errors = [];
    if (correctCurrPassword) {

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        var newPasswordObject = await newPasswords.create({ voterId: req.query.voterId, newPassword: hashedNewPassword, otp: otp });
        var newPasswordId = newPasswordObject._id;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_EMAIL,
                pass: process.env.GMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.GMAIL_EMAIL,
            to: req.session.user.email,
            subject: 'Password Change Verification Code',
            text: `
        Dear ${req.session.user.firstName} ${req.session.user.middleName} ${req.session.user.lastName},

        Thank you for initiating the password change process for your account. To complete this process, please use the following verification code:

        Verification Code: ${otp}

        Please enter this code on the verification code page to finalize the password change. If you did not request this change, please contact us via email immediately.

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

        res.render('otpVerification', { voterId: req.query.voterId, errors: [], type: req.query.type, newPasswordId: newPasswordId, electionId: 'NULL', errors });


    }
    else {
        errors.push({ msg: 'Incorrect current password. Please try again.' });
        res.render('changePassword', { voterId: req.session.user._id, errors });
    }

})

module.exports = router;