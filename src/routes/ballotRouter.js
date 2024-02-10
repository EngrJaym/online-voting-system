const express = require('express');
const router = express.Router();
const Ballot = require('../models/schema');

const homeController = require('../controllers/homeController');
router.get('/', homeController.showBallot)

router.post('/submit-ballot',async (req,res) => {
    try {
        console.log(req.body.President);
        const newBallot = await Ballot.create({candidateName: req.body.President, voterName: 'TestVoter'});
        console.log('--- Ballot Receipt --- \n', newBallot);
        res.status(201).json(newBallot);
    } catch (error) {
        console.error('Error saving ballot:', error);
        res.status(500).send('Error saving ballot');
    }
});
module.exports = router; 