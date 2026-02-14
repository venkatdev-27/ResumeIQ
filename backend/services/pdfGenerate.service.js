const fs = require('fs/promises');
const pdfParse = require('pdf-parse');
const puppeteer = require('puppeteer');
const { normalizeText } = require('../utils/normalizeText');
const { AppError } = require('../utils/response');

const extractTextFromPdfFile = async (filePath) => {
    try {
        const fileBuffer = await fs.readFile(filePath);
        const parsed = await pdfParse(fileBuffer);
        return normalizeText(parsed.text || '');
    } catch (err) {
        console.error('PDF parse error:', err.message);
        throw new AppError('Failed to read PDF file.', 400);
    }
};

const generatePdfFromHtml = async (html) => {
    const htmlContent = String(html || '').trim();

    if (!htmlContent) {
        throw new AppError('HTML content is required to generate PDF.', 400);
    }

    let browser;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--font-render-hinting=none',
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        });

        const page = await browser.newPage();

        page.setDefaultNavigationTimeout(30000);
        page.setDefaultTimeout(30000);

        await page.setViewport({
            width: 794,
            height: 1123,
            deviceScaleFactor: 2,
        });

        await page.emulateMediaType('screen');

        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0',
            timeout: 30000,
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
        });

        return Buffer.from(pdfBuffer);
    } catch (err) {
        console.error('PDF generation error:', err.message);
        throw new AppError('Failed to generate PDF.', 500);
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
    }
};

module.exports = {
    extractTextFromPdfFile,
    generatePdfFromHtml,
};
