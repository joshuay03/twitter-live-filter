const express = require('express');
const router = express.Router();

const streamRouter = require('./stream');

// Router for the stream route
router.use('/stream', streamRouter);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
