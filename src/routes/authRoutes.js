const express = require('express');
const router = express.Router();
const { login, register, getSession } = require('../controllers/authController');

router.post('/auth/login', login);
router.post('/auth/register', register);
router.get('/auth/session', getSession);
router.post('/auth/logout', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Sesión cerrada' });
});

module.exports = router;
