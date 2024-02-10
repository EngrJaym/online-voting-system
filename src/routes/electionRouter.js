const express = require('express');
const router = express.Router();

router.post('/config', (req,res) => {
    try {
        res.send(req.body);
    } catch (error) {
        console.log(error)
    }
})
module.exports = router;