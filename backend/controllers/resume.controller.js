const fs = require('fs/promises');
const axios = require('axios');
const mongoose = require('mongoose');
const { pipeline } = require('stream/promises');

const cloudinary = require('../config/cloudinary');
const Resume = require('../models/Resume.model');
const { extractTextFromPdfFile, generatePdfFromHtml, generatePdfFromUrl } = require('../services/pdfGenerate.service');
const { AppError, asyncHandler, sendSuccess } = require('../utils/response');

const requireAuthenticatedUserId = (req) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new AppError('Unauthorized user context.', 401);
    }
    return userId;
};

const sanitizeFilename = (value = '') => {
    const normalized = String(value || 'resume')
        .replace(/\.pdf$/i, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);

    const safeBase = normalized || 'resume';
    return `${safeBase}.pdf`;
};

const buildContentDisposition = (fileName) => {
    const asciiName = String(fileName || 'resume.pdf')
        .replace(/[^\x20-\x7E]/g, '_')
        .replace(/["\\]/g, '_');
    const encodedName = encodeURIComponent(fileName || 'resume.pdf');

    return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`;
};

const setPdfHeaders = (res, fileName, contentLength) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', buildContentDisposition(fileName));
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (Number.isFinite(contentLength) && contentLength > 0) {
        res.setHeader('Content-Length', String(contentLength));
    }
};

const parseResumeData = (value) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new AppError('Invalid resumeData JSON payload.', 400);
            }
            return parsed;
        } catch (_error) {
            throw new AppError('Invalid resumeData JSON payload.', 400);
        }
    }

    throw new AppError('Invalid resumeData payload.', 400);
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const toText = (value) => String(value || '').trim();

const buildResumeTextFromData = (resumeData = {}) => {
    const personal = resumeData?.personalDetails || {};

    const appendIfText = (label, value) => {
        const text = toText(value);
        return text ? `${label}: ${text}` : '';
    };

    const listToText = (list, mapFn) =>
        toArray(list)
            .map((item, index) => toText(mapFn(item || {}, index)))
            .filter(Boolean)
            .join('\n');

    const sections = [
        appendIfText('Name', personal.fullName),
        appendIfText('Title', personal.title),
        appendIfText('Email', personal.email),
        appendIfText('Phone', personal.phone),
        appendIfText('Location', personal.location),
        appendIfText('Summary', personal.summary),
        appendIfText('Skills', toArray(resumeData.skills).join(', ')),
        appendIfText('Certifications', toArray(resumeData.certifications).join(', ')),
        appendIfText('Achievements', toArray(resumeData.achievements).join(', ')),
        appendIfText('Hobbies', toArray(resumeData.hobbies).join(', ')),
        listToText(resumeData.workExperience, (item) => `${item.role || ''} ${item.company || ''} ${item.description || ''}`),
        listToText(resumeData.projects, (item) => `${item.name || ''} ${item.techStack || ''} ${item.description || ''}`),
        listToText(resumeData.internships, (item) => `${item.role || ''} ${item.company || ''} ${item.description || ''}`),
        listToText(resumeData.education, (item) => `${item.degree || ''} ${item.institution || ''} ${item.description || ''}`),
    ];

    return sections.filter(Boolean).join('\n').trim();
};

const requireCloudinaryEnv = () => {
    const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length) {
        throw new AppError(`Cloudinary credentials are not configured: ${missing.join(', ')}`, 500);
    }
};

const uploadResume = asyncHandler(async (req, res) => {
    const userId = requireAuthenticatedUserId(req);
    const uploadedFile = req.file;
    const parsedResumeData = parseResumeData(req.body?.resumeData);
    const templateName = toText(req.body?.templateName) || 'template1';
    const resumeTextFromBody = toText(req.body?.resumeText);

    if (!uploadedFile?.path && !parsedResumeData) {
        throw new AppError('Provide either a resume PDF file or resumeData payload.', 400);
    }

    if (!uploadedFile?.path) {
        const resume = await Resume.create({
            user: userId,
            templateName,
            resumeData: parsedResumeData || undefined,
            text: resumeTextFromBody || buildResumeTextFromData(parsedResumeData || {}),
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

    requireCloudinaryEnv();

    let extractedText = '';

    try {
        try {
            extractedText = await extractTextFromPdfFile(uploadedFile.path);
        } catch (_error) {
            throw new AppError('Uploaded PDF could not be processed.', 400);
        }

        let cloudinaryResult;
        try {
            cloudinaryResult = await cloudinary.uploader.upload(uploadedFile.path, {
                resource_type: 'raw',
                folder: process.env.CLOUDINARY_RESUME_FOLDER || 'ai-resume-scanner/resumes',
                use_filename: true,
                unique_filename: true,
                overwrite: false,
                format: 'pdf',
                timeout: 60_000,
            });
        } catch (_error) {
            throw new AppError('Cloudinary upload failed.', 502);
        }

        if (!cloudinaryResult?.secure_url) {
            throw new AppError('Cloudinary upload failed to return a secure URL.', 502);
        }

        const resume = await Resume.create({
            user: userId,
            templateName,
            resumeData: parsedResumeData || undefined,
            fileName: sanitizeFilename(uploadedFile.originalname || 'resume.pdf'),
            mimeType: uploadedFile.mimetype || 'application/pdf',
            size: uploadedFile.size || 0,
            text: resumeTextFromBody || extractedText || buildResumeTextFromData(parsedResumeData || {}),
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
        if (uploadedFile?.path) {
            await fs.unlink(uploadedFile.path).catch(() => {});
        }
    }
});

const generateResumePdf = asyncHandler(async (req, res) => {
    const html = toText(req.body?.html);
    const url = toText(req.body?.url);
    const fileName = sanitizeFilename(req.body?.fileName || 'resume.pdf');

    if (!html && !url) {
        throw new AppError('Either HTML content or URL is required.', 400);
    }

    const { stream, contentLength, cleanup } = url ? await generatePdfFromUrl(url) : await generatePdfFromHtml(html);
    setPdfHeaders(res, fileName, contentLength);
    res.status(200);
    try {
        await pipeline(stream, res);
    } finally {
        await cleanup();
    }
});

const escapeHtml = (value = '') =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const renderListItems = (items = []) =>
    toArray(items)
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('');

const renderExperienceBlocks = (items = []) =>
    toArray(items)
        .map((item) => {
            const role = escapeHtml(item?.role || '');
            const company = escapeHtml(item?.company || '');
            const description = escapeHtml(item?.description || '');
            return `<div class="block"><h4>${role}${role && company ? ' - ' : ''}${company}</h4><p>${description}</p></div>`;
        })
        .join('');

const renderProjectBlocks = (items = []) =>
    toArray(items)
        .map((item) => {
            const name = escapeHtml(item?.name || item?.title || '');
            const techStack = escapeHtml(item?.techStack || '');
            const description = escapeHtml(item?.description || '');
            return `<div class="block"><h4>${name}</h4><p>${techStack}</p><p>${description}</p></div>`;
        })
        .join('');

const renderEducationBlocks = (items = []) =>
    toArray(items)
        .map((item) => {
            const degree = escapeHtml(item?.degree || '');
            const institution = escapeHtml(item?.institution || '');
            const description = escapeHtml(item?.description || '');
            return `<div class="block"><h4>${degree}${degree && institution ? ' - ' : ''}${institution}</h4><p>${description}</p></div>`;
        })
        .join('');

const generateHtmlFromResumeData = (resumeData = {}, templateName = 'template1') => {
    const personal = resumeData?.personalDetails || {};
    const fullName = escapeHtml(personal.fullName || '');
    const title = escapeHtml(personal.title || '');
    const email = escapeHtml(personal.email || '');
    const phone = escapeHtml(personal.phone || '');
    const location = escapeHtml(personal.location || '');
    const summary = escapeHtml(personal.summary || '');

    return `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @page { size: A4; margin: 12mm; }
      :root {
        --print-page-height: 297mm;
        --print-margin: 12mm;
        --print-content-min-height: calc(var(--print-page-height) - (var(--print-margin) * 2));
      }
      html, body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: Arial, sans-serif; color: #1e1e1e; line-height: 1.5; }
      #resume-ready { width: 100%; min-height: var(--print-content-min-height); margin: 0 auto; box-sizing: border-box; }
      h1, h2, h3, h4 { margin: 0; }
      h1 { font-size: 28px; margin-bottom: 6px; }
      h2 { font-size: 16px; margin-top: 18px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
      p { margin: 4px 0; white-space: pre-wrap; word-break: break-word; }
      ul { margin: 4px 0 0 18px; padding: 0; }
      .meta { color: #555; margin-bottom: 10px; }
      .block { margin-bottom: 10px; }
      .template { font-size: 11px; color: #777; margin-top: 20px; }
      section { break-inside: auto; page-break-inside: auto; }
      article, .block, li { break-inside: avoid; page-break-inside: avoid; }
    </style>
  </head>
  <body>
    <div id="resume-ready">
      <h1>${fullName}</h1>
      <h3>${title}</h3>
      <p class="meta">${email}${email && phone ? ' | ' : ''}${phone}${(email || phone) && location ? ' | ' : ''}${location}</p>
      <h2>Summary</h2>
      <p>${summary}</p>
      <h2>Skills</h2>
      <ul>${renderListItems(resumeData.skills)}</ul>
      <h2>Work Experience</h2>
      ${renderExperienceBlocks(resumeData.workExperience)}
      <h2>Projects</h2>
      ${renderProjectBlocks(resumeData.projects)}
      <h2>Education</h2>
      ${renderEducationBlocks(resumeData.education)}
      <p class="template">Template: ${escapeHtml(templateName || 'template1')}</p>
    </div>
  </body>
</html>`;
};

const streamCloudinaryFileToResponse = async ({ url, res, fileName }) => {
    const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 120_000,
        maxRedirects: 10,
        validateStatus: (status) => status >= 200 && status < 400,
    });

    const contentLength = Number(response.headers?.['content-length'] || 0);
    setPdfHeaders(res, fileName, contentLength);
    res.status(200);
    await pipeline(response.data, res);
};

const downloadResume = asyncHandler(async (req, res) => {
    const userId = requireAuthenticatedUserId(req);
    const { id: resumeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
        throw new AppError('Invalid resume ID.', 400);
    }

    const resume = await Resume.findOne({
        _id: resumeId,
        user: userId,
    }).lean();

    if (!resume) {
        throw new AppError('Resume not found or access denied.', 404);
    }

    const fileName = sanitizeFilename(resume.fileName || `${resume.templateName || 'resume'}.pdf`);

    if (resume.cloudinaryUrl) {
        try {
            await streamCloudinaryFileToResponse({
                url: resume.cloudinaryUrl,
                res,
                fileName,
            });
            return;
        } catch (_error) {
            throw new AppError('Failed to download resume from storage.', 502);
        }
    }

    if (!resume.resumeData || typeof resume.resumeData !== 'object') {
        throw new AppError('Resume data not available for download.', 400);
    }

    const html = generateHtmlFromResumeData(resume.resumeData, resume.templateName);
    const { stream, contentLength, cleanup } = await generatePdfFromHtml(html);
    setPdfHeaders(res, fileName, contentLength);
    res.status(200);
    try {
        await pipeline(stream, res);
    } finally {
        await cleanup();
    }
});

module.exports = {
    uploadResume,
    generateResumePdf,
    downloadResume,
};
