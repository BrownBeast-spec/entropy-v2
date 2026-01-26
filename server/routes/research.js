const router = require('express').Router();

router.get('/', (req, res) => {
    res.send('Research route');
});

module.exports = router;
