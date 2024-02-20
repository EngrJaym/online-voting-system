const path = require('path');
const homeController = {
    showHomepage: (req, res) => {
        res.sendFile(path.join(__dirname, "..", "..", "public", "html", "index.html"));
        console.log(path.join(__dirname, "..", "..", "public", "html", "index.html"))
        
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