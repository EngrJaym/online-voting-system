const express = require('express');
const router = express.Router();
const Election = require('../models/election');
const { Ballot, Votes } = require('../models/ballot');
const Voters = require('../models/voters');

const isVoter = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'voter'){
        return next();
    }else{
        return res.redirect('/');
    }
};

router.use(isVoter);

router.get('/dashboard', async (req, res) => {
    const voter = req.session.user;
    const invitedElections = await Election.find({ voters: { $in: voter._id } });
    const ids = invitedElections.map(election => election._id);
    const votes = await Votes.find({electionId: {$in: ids}, creator: voter.studentNumber});
    const votedElections = [];
    for (const vote of votes){
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
    for (const key in req.body){
        const vote = await Votes.create({position: key, candidates: req.body[key], creator: req.session.user.studentNumber, electionId: req.query.electionId});
        console.log(vote);
    }
    
    res.redirect('/voter/dashboard');
});

router.get('/viewFinalResults', async(req, res) => {
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
    for (const key in groupedByCreator){
        voterTurnout++;
    };
    const voterTurnoutPercentage = ((voterTurnout / votersCount) * 100).toFixed(2);
    res.render('votersFinalResults', { election, ballots, results, status: 'FINISHED', votes: groupedByCreator, votersCount, voterTurnout: voterTurnout.toFixed(2), voterTurnoutPercentage });

})

module.exports = router;