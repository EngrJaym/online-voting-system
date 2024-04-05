const express = require('express');
const router = express.Router();
const Election = require('../models/election');
const { Ballot, Votes } = require('../models/ballot');
const Voters = require('../models/voters');

router.get('/dashboard', async (req, res) => {
    const voter = req.session.user;
    const invitedElections = await Election.find({ voters: { $in: voter._id } });
    const votedElections = 
    res.render('voterDashboard', { voter, invitedElections });
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
    for (const key in req.body){
        const vote = await Votes.create({position: key, candidates: req.body[key], creator: req.session.user, electionId: req.query.electionId});
        console.log(vote);
    }
    
    res.redirect('/voter/dashboard');
})

module.exports = router;