const fs = require('fs/promises');
const cloudinary = require('../config/cloudinary');
const Resume = require('../models/Resume.model');
const { extractTextFromPdfFile, generatePdfFromHtml } = require('../services/pdfGenerate.service');
const { AppError, asyncHandler, sendSuccess } = require('../utils/response');

const parseResumeData = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value === 'object') {
        return value;
    }

    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (_error) {
            throw new AppError('Invalid resumeData JSON payload.', 400);
        }
    }

    return null;
};

const buildResumeTextFromData = (resumeData = {}) => {
    const personal = resumeData.personalDetails || {};

    const listToText = (list = [], mapFn) =>
        list
            .map((item, index) => {
                const value = mapFn(item, index);
                return value ? String(value).trim() : '';
            })
            .filter(Boolean)
            .join('\n');

    const sections = [
        `Name: ${personal.fullName || ''}`.trim(),
        `Title: ${personal.title || ''}`.trim(),
        `Email: ${personal.email || ''}`.trim(),
        `Phone: ${personal.phone || ''}`.trim(),
        `Location: ${personal.location || ''}`.trim(),
        `Summary: ${personal.summary || ''}`.trim(),
        `Skills: ${(resumeData.skills || []).join(', ')}`.trim(),
        `Certifications: ${(resumeData.certifications || []).join(', ')}`.trim(),
        `Achievements: ${(resumeData.achievements || []).join(', ')}`.trim(),
        `Hobbies: ${(resumeData.hobbies || []).join(', ')}`.trim(),
        listToText(resumeData.workExperience, (item) => `${item.role || ''} ${item.company || ''} ${item.description || ''}`),
        listToText(resumeData.projects, (item) => `${item.name || ''} ${item.techStack || ''} ${item.description || ''}`),
        listToText(resumeData.internships, (item) => `${item.role || ''} ${item.company || ''} ${item.description || ''}`),
        listToText(resumeData.education, (item) => `${item.degree || ''} ${item.institution || ''} ${item.description || ''}`),
    ];

    return sections
        .filter(Boolean)
        .filter((line) => !line.endsWith(':'))
        .join('\n');
};

const toDownloadFilename = (value = '') => {
    const normalized = String(value || 'resume')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .trim();

    const safeBase = normalized || 'resume';
    return safeBase.toLowerCase().endsWith('.pdf') ? safeBase : `${safeBase}.pdf`;
};

const uploadResume = asyncHandler(async (req, res) => {
    const uploadedFile = req.file;
    const parsedResumeData = parseResumeData(req.body.resumeData);
    const templateName = req.body.templateName || 'template1';
    const resumeTextFromBody = req.body.resumeText || '';

    if (!uploadedFile?.path && !parsedResumeData) {
        throw new AppError('Provide either a resume PDF file or resumeData payload.', 400);
    }

    if (!uploadedFile?.path) {
        const resume = await Resume.create({
            user: req.user._id,
            templateName,
            resumeData: parsedResumeData,
            text: resumeTextFromBody || buildResumeTextFromData(parsedResumeData),
        });

        return sendSuccess(
            res,
            {
                id: resume._id,
                resumeId: resume._id,
                templateName: resume.templateName,
                resumeData: resume.resumeData,
                parsedText: resume.text,
            },
            'Resume data saved successfully',
            201,
        );
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new AppError('Cloudinary credentials are not configured.', 500);
    }

    let extractedText = '';

    try {
        extractedText = await extractTextFromPdfFile(uploadedFile.path);

        const cloudinaryResult = await cloudinary.uploader.upload(uploadedFile.path, {
            resource_type: 'raw',
            folder: process.env.CLOUDINARY_RESUME_FOLDER || 'ai-resume-scanner/resumes',
            use_filename: true,
            unique_filename: true,
            overwrite: false,
            format: 'pdf',
        });

        if (!cloudinaryResult?.secure_url) {
            throw new AppError('Cloudinary upload failed to return a secure URL.', 502);
        }

        const resume = await Resume.create({
            user: req.user._id,
            templateName,
            resumeData: parsedResumeData || undefined,
            fileName: uploadedFile.originalname,
            mimeType: uploadedFile.mimetype,
            size: uploadedFile.size,
            text: resumeTextFromBody || extractedText,
            cloudinaryUrl: cloudinaryResult.secure_url,
        });

        return sendSuccess(
            res,
            {
                id: resume._id,
                resumeId: resume._id,
                templateName: resume.templateName,
                resumeData: resume.resumeData,
                fileName: resume.fileName,
                size: resume.size,
                parsedText: resume.text,
                parsedResume: {},
                cloudinaryUrl: resume.cloudinaryUrl,
            },
            'Resume uploaded successfully',
            201,
        );
    } finally {
        await fs.unlink(uploadedFile.path).catch(() => {});
    }
});

const generateResumePdf = asyncHandler(async (req, res) => {
    const html = typeof req.body?.html === 'string' ? req.body.html : '';
    const fileName = toDownloadFilename(req.body?.fileName || 'resume.pdf');

    if (!html.trim()) {
        throw new AppError('HTML content is required.', 400);
    }

    const pdfBuffer = await generatePdfFromHtml(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(pdfBuffer);
});

module.exports = {
    uploadResume,
    generateResumePdf,
};
