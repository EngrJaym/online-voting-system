const path = require('path');
const homeController = {
    showHomepage: (req, res) => {
        res.render('index');
        
    },
    showElectionConfig: (req, res) => {
        res.render('electionconfig');
    },
    showSignupPage: (req,res) => {
        res.render('signup')
    },
    showLoginPage: (req,res) => {
        res.render('login');
    }
}
module.exports = homeController;