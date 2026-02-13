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

// NEW: Download existing resume by ID
const downloadResume = asyncHandler(async (req, res) => {
    const { id: resumeId } = req.params;

    // Find the resume by ID and ensure it belongs to the authenticated user
    const resume = await Resume.findOne({
        _id: resumeId,
        user: req.user._id
    });

    if (!resume) {
        throw new AppError('Resume not found or access denied.', 404);
    }

    // If the resume has a cloudinary URL, redirect to it
    if (resume.cloudinaryUrl) {
        // Set headers for direct download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${resume.fileName || 'resume.pdf'}"`);
        
        // For mobile compatibility, we'll stream the file instead of redirecting
        try {
            const response = await fetch(resume.cloudinaryUrl);
            if (!response.ok) {
                throw new AppError('Failed to fetch resume from storage.', 502);
            }
            
            // Stream the file directly to the client
            response.body.pipe(res);
        } catch (error) {
            throw new AppError('Failed to download resume. Please try again.', 500);
        }
        return;
    }

    // If no cloudinary URL, generate PDF from stored data
    if (!resume.resumeData) {
        throw new AppError('Resume data not available for download.', 400);
    }

    // Generate HTML from resume data (you'll need to implement this based on your template system)
    const html = generateHtmlFromResumeData(resume.resumeData, resume.templateName);
    const pdfBuffer = await generatePdfFromHtml(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.fileName || 'resume.pdf'}"`);
    res.status(200).send(pdfBuffer);
});

// Helper function to generate HTML from resume data
const generateHtmlFromResumeData = (resumeData, templateName) => {
    // This is a simplified example - you should implement this based on your actual template system
    const template = getTemplateHtml(templateName);
    
    // Replace placeholders with actual data
    let html = template;
    
    // Replace basic placeholders
    html = html.replace('{{fullName}}', resumeData.personalDetails?.fullName || '');
    html = html.replace('{{title}}', resumeData.personalDetails?.title || '');
    html = html.replace('{{email}}', resumeData.personalDetails?.email || '');
    html = html.replace('{{phone}}', resumeData.personalDetails?.phone || '');
    html = html.replace('{{location}}', resumeData.personalDetails?.location || '');
    html = html.replace('{{summary}}', resumeData.personalDetails?.summary || '');
    
    // Add skills
    const skillsHtml = (resumeData.skills || []).map(skill => `<li>${skill}</li>`).join('');
    html = html.replace('{{skills}}', skillsHtml);
    
    // Add work experience
    const workHtml = (resumeData.workExperience || []).map(exp => `
        <div>
            <h4>${exp.role || ''} at ${exp.company || ''}</h4>
            <p>${exp.description || ''}</p>
        </div>
    `).join('');
    html = html.replace('{{workExperience}}', workHtml);
    
    // Add education
    const eduHtml = (resumeData.education || []).map(edu => `
        <div>
            <h4>${edu.degree || ''} - ${edu.institution || ''}</h4>
            <p>${edu.description || ''}</p>
        </div>
    `).join('');
    html = html.replace('{{education}}', eduHtml);
    
    return html;
};

// Helper function to get template HTML (simplified)
const getTemplateHtml = (templateName) => {
    // This should return the actual HTML template based on the template name
    // For now, returning a basic template
    return `
        <!doctype html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #333; }
                h2 { color: #666; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                ul { list-style-type: none; padding: 0; }
                li { margin: 5px 0; }
            </style>
        </head>
        <body>
            <h1>{{fullName}}</h1>
            <h2>{{title}}</h2>
            <p>{{email}} | {{phone}} | {{location}}</p>
            <h2>Summary</h2>
            <p>{{summary}}</p>
            <h2>Skills</h2>
            <ul>{{skills}}</ul>
            <h2>Work Experience</h2>
            {{workExperience}}
            <h2>Education</h2>
            {{education}}
        </body>
        </html>
    `;
};

module.exports = {
    uploadResume,
    generateResumePdf,
    downloadResume,
};