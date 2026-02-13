const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { AppError } = require('../utils/response');

const TEMP_UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads', 'temp');
const MAX_PDF_SIZE = 2 * 1024 * 1024;

if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
    fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, TEMP_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const safeBase = path
            .parse(file.originalname)
            .name.replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 50);
        const timestamp = Date.now();
        cb(null, `${safeBase || 'resume'}_${timestamp}.pdf`);
    },
});

const fileFilter = (_req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExtension = extension === '.pdf';

    if (isPdfMime && isPdfExtension) {
        cb(null, true);
        return;
    }

    cb(new AppError('Only PDF resume files are allowed.', 400));
};

const multerUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_PDF_SIZE,
        files: 1,
    },
});

const uploadResumeMiddleware = (req, res, next) => {
    multerUpload.single('resume')(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError('Resume PDF must be less than or equal to 2MB.', 413));
        }

        return next(error);
    });
};

const requireResumeFile = (req, _res, next) => {
    const hasResumeData = Boolean(req.body?.resumeData);
    if (!req.file && !hasResumeData) {
        return next(new AppError('Resume PDF file or resumeData payload is required.', 400));
    }
    return next();
};

module.exports = {
    uploadResumeMiddleware,
    requireResumeFile,
};
