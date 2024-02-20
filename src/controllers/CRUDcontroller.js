const CRUDController = {
    showBallot: (req, res) => {
        const electionTitle = 'URSM President';
        const candidates = ['Jaym', 'Andrei', 'Jacob', 'Ken', 'Jet'];
        res.render('ballot', { electionTitle, candidates });
    }
}
module.exports = CRUDController;