const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { AppError } = require('../utils/response');

const TEMP_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'temp');

const getMaxPdfSizeBytes = () => {
    const value = Number(process.env.MAX_PDF_SIZE_MB || 5);
    const safeMb = Number.isFinite(value) && value > 0 ? value : 5;
    return Math.floor(safeMb * 1024 * 1024);
};

const getMaxPdfSizeLabel = () => {
    const value = Number(process.env.MAX_PDF_SIZE_MB || 5);
    const safeMb = Number.isFinite(value) && value > 0 ? value : 5;
    return String(safeMb);
};

const ALLOWED_PDF_MIME_TYPES = new Set([
    'application/pdf',
    'application/x-pdf',
    'application/acrobat',
    'applications/vnd.pdf',
    'text/pdf',
    'text/x-pdf',
    'application/octet-stream',
]);

if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
    fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, TEMP_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const safeBase = path
            .parse(file.originalname || 'resume')
            .name
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 50);

        cb(null, `${safeBase || 'resume'}_${Date.now()}.pdf`);
    },
});

const fileFilter = (_req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const mimeType = String(file.mimetype || '').toLowerCase();
    const isPdfMime = ALLOWED_PDF_MIME_TYPES.has(mimeType) || mimeType.includes('pdf');
    const isPdfExtension = extension === '.pdf';

    if (!isPdfMime || !isPdfExtension) {
        return cb(new AppError('Only PDF resume files are allowed.', 400));
    }

    return cb(null, true);
};

const multerUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: getMaxPdfSizeBytes(),
        files: 1,
    },
});

const uploadResumeMiddleware = (req, res, next) => {
    multerUpload.single('resume')(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError(`Resume PDF must be less than or equal to ${getMaxPdfSizeLabel()}MB.`, 413));
        }

        if (!(error instanceof AppError)) {
            return next(new AppError(error.message || 'Failed to upload file.', 400));
        }

        return next(error);
    });
};

const requireResumeFile = (req, _res, next) => {
    const hasResumeData =
        typeof req.body?.resumeData === 'string'
            ? req.body.resumeData.trim().length > 0
            : Boolean(req.body?.resumeData);

    if (!req.file && !hasResumeData) {
        return next(new AppError('Resume PDF file or resumeData payload is required.', 400));
    }

    return next();
};

module.exports = {
    uploadResumeMiddleware,
    requireResumeFile,
};
