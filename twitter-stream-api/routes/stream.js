const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');

/* GET Twitter stream. */
router.get('/', streamController.get);

module.exports = router;
