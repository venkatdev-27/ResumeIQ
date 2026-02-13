const express = require('express');
const { resumeImproveController } = require('../controllers/resumeImprove.controller');
const { protect } = require('../middlewares/auth.middleware');
const { validateAiImproveBody } = require('../validations/resume.validation');

const router = express.Router();

router.post('/improve', protect, validateAiImproveBody, resumeImproveController);

module.exports = router;
