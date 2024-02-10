const homeController = {
    showHomepage: (req, res, next) => {
        res.render('index');
        next();
    },
    showBallot: (req, res, next) => {
        const electionTitle = 'URSM President';
        const candidates = ['Jaym', 'Andrei', 'Jacob', 'Ken', 'Jet'];
        res.render('ballot', {electionTitle, candidates});
        next();
    },
    showElectionConfig: (req, res, next) => {
        res.render('electionconfig');
        next();
    }
}
module.exports = homeController;