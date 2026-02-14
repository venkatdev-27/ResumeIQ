const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const path = require('path');
const pdfParse = require('pdf-parse');
const puppeteer = require('puppeteer');
const { normalizeText } = require('../utils/normalizeText');
const { AppError } = require('../utils/response');

const extractTextFromPdfFile = async (filePath) => {
    try {
        const fileBuffer = await fsPromises.readFile(filePath);
        const parsed = await pdfParse(fileBuffer);
        return normalizeText(parsed.text || '');
    } catch (err) {
        console.error('PDF parse error:', err.message);
        throw new AppError('Failed to read PDF file.', 400);
    }
};

const PDF_VIEWPORT = {
    width: 794,
    height: 1123,
    deviceScaleFactor: 2,
};

const PUPPETEER_LAUNCH_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-zygote',
    '--disable-extensions',
    '--disable-features=site-per-process,Translate,BackForwardCache',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--mute-audio',
    '--font-render-hinting=none',
];

let browserPromise = null;

const resolveExecutablePath = () => {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    if (process.env.CHROMIUM_PATH) {
        return process.env.CHROMIUM_PATH;
    }

    return undefined;
};

const launchBrowser = async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: PUPPETEER_LAUNCH_ARGS,
        executablePath: resolveExecutablePath(),
    });
    browser.once('disconnected', () => {
        browserPromise = null;
    });
    return browser;
};

const getBrowser = async () => {
    if (!browserPromise) {
        browserPromise = launchBrowser();
    }

    let browser = await browserPromise;
    if (!browser.isConnected()) {
        browserPromise = launchBrowser();
        browser = await browserPromise;
    }

    return browser;
};

const createTempPdfPath = () =>
    path.join(
        process.env.PDF_TMP_DIR || os.tmpdir(),
        `resume_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.pdf`,
    );

const generatePdfFromHtml = async (html) => {
    const htmlContent = String(html || '').trim();

    if (!htmlContent) {
        throw new AppError('HTML content is required to generate PDF.', 400);
    }

    const tempPdfPath = createTempPdfPath();
    let page = null;

    try {
        const browser = await getBrowser();
        page = await browser.newPage();

        page.setDefaultNavigationTimeout(0);
        page.setDefaultTimeout(0);

        await page.setViewport(PDF_VIEWPORT);

        await page.emulateMediaType('screen');

        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0',
            timeout: 0,
        });

        await page.pdf({
            path: tempPdfPath,
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
        });

        const stats = await fsPromises.stat(tempPdfPath);
        const stream = fs.createReadStream(tempPdfPath);
        let cleaned = false;
        const cleanup = async () => {
            if (cleaned) {
                return;
            }
            cleaned = true;
            await fsPromises.unlink(tempPdfPath).catch(() => {});
        };

        stream.on('close', () => {
            cleanup().catch(() => {});
        });
        stream.on('error', () => {
            cleanup().catch(() => {});
        });

        return {
            stream,
            contentLength: stats.size,
            cleanup,
        };
    } catch (err) {
        await fsPromises.unlink(tempPdfPath).catch(() => {});
        console.error('PDF generation error:', err.message);
        throw new AppError('Failed to generate PDF.', 500);
    } finally {
        if (page) {
            await page.close().catch(() => {});
        }
    }
};

module.exports = {
    extractTextFromPdfFile,
    generatePdfFromHtml,
};
