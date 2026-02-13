const express = require('express');
const { uploadResume, generateResumePdf, downloadResume } = require('../controllers/resume.controller');
const { protect } = require('../middlewares/auth.middleware');
const { uploadResumeMiddleware, requireResumeFile } = require('../middlewares/upload.middleware');
const { validateGeneratePdfBody, validateResumeUploadBody } = require('../validations/resume.validation');

const router = express.Router();

router.post('/upload', protect, uploadResumeMiddleware, requireResumeFile, validateResumeUploadBody, uploadResume);
router.post('/generate-pdf', protect, validateGeneratePdfBody, generateResumePdf);
router.get('/download/:id', protect, downloadResume);

module.exports = router;
