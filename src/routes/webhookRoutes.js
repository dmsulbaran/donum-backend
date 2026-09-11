const express = require('express');
const router = express.Router();
const { handleBdvWebhook } = require('../controllers/webhookController');

router.post('/webhook/bdv', handleBdvWebhook);

module.exports = router;