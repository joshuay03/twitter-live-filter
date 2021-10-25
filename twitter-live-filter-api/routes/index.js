const express = require('express');
const router = express.Router();

const filterRouter = require('./filter');

// Router for the stream route
router.use('/filter', filterRouter);

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});

module.exports = router;
