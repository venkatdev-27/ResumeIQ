const fs = require('fs/promises');
const pdfParse = require('pdf-parse');
const puppeteer = require('puppeteer');
const { normalizeText } = require('../utils/normalizeText');
const { AppError } = require('../utils/response');

const extractTextFromPdfFile = async (filePath) => {
    const fileBuffer = await fs.readFile(filePath);
    const parsed = await pdfParse(fileBuffer);
    return normalizeText(parsed.text || '');
};

const generatePdfFromHtml = async (html) => {
    const htmlContent = String(html || '').trim();

    if (!htmlContent) {
        throw new AppError('HTML content is required to generate PDF.', 400);
    }

    let browser;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBytes = await page.pdf({
            format: 'A4',
            printBackground: true,
        });

        return Buffer.from(pdfBytes);
    } catch (_error) {
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
