const express = require('express');
const { getScore } = require('../controllers/ats.controller');
const { protect } = require('../middlewares/auth.middleware');
const { validateAtsRequestBody } = require('../validations/resume.validation');

const router = express.Router();

router.post('/score', protect, validateAtsRequestBody, getScore);

module.exports = router;
