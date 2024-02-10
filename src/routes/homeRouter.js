const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');
router.get('/', homeController.showHomepage)
router.get('/electionconfig', homeController.showElectionConfig)
module.exports = router;