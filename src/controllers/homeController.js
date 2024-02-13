const path = require('path');
const homeController = {
    showHomepage: (req, res) => {
        res.sendFile(path.join(__dirname, "..", "..", "public", "html", "index.html"));
        console.log(path.join(__dirname, "..", "..", "public", "html", "index.html"))
        
    },
    showBallot: (req, res) => {
        const electionTitle = 'URSM President';
        const candidates = ['Jaym', 'Andrei', 'Jacob', 'Ken', 'Jet'];
        res.render('ballot', {electionTitle, candidates});

    },
    showElectionConfig: (req, res) => {
        res.render('electionconfig');
    },
    showSignupPage: (req,res) => {
        res.sendFile(path.join(__dirname, "..", "..", "public", "html", "signup.html"));
    },
    showLoginPage: (req,res) => {
        res.sendFile(path.join(__dirname, "..", "..", "public", "html", "login.html"));
    }
}
module.exports = homeController;