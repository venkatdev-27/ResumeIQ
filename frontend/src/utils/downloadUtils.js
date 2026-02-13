/**
 * Mobile-safe download utility for PDF files
 * Handles both blob downloads and direct URL downloads with proper mobile support
 */
import { API_BASE_URL } from '@/utils/constants';

const MOBILE_UA_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const isMobileDevice = () => MOBILE_UA_REGEX.test(navigator.userAgent);

const resolveDownloadUrl = (url = '') => {
    const raw = String(url || '').trim();
    if (!raw) {
        return '';
    }

    if (/^(blob:|data:|https?:\/\/)/i.test(raw)) {
        return raw;
    }

    const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
    return new URL(normalizedPath, API_ORIGIN).href;
};

/**
 * Downloads a file using a blob (for generated PDFs)
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename for the download
 */
export const downloadBlob = (blob, filename = 'resume.pdf') => {
    const url = window.URL.createObjectURL(blob);
    const isMobile = isMobileDevice();
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener noreferrer';

    if (isMobile) {
        // On mobile, opening in a new tab is more reliable when direct file save is restricted.
        link.target = '_blank';
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Delay cleanup to avoid revoking the URL before mobile browsers start the download/viewer.
    setTimeout(() => {
        window.URL.revokeObjectURL(url);
    }, 30_000);
};

/**
 * Downloads a file using a direct URL (for stored files)
 * @param {string} url - The direct URL to the file
 * @param {string} filename - The filename for the download
 */
export const downloadFromUrl = (url, filename = 'resume.pdf') => {
    const resolvedUrl = resolveDownloadUrl(url);
    if (!resolvedUrl) {
        throw new Error('Invalid download URL');
    }

    const isMobile = isMobileDevice();
    const link = document.createElement('a');
    link.href = resolvedUrl;
    link.download = filename;
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (isMobile) {
        return;
    }
};

/**
 * Downloads a resume with proper error handling and mobile support
 * @param {Function} downloadFunction - The API function to call
 * @param {string|Object} params - Parameters for the download function
 * @param {string} filename - The filename for the download
 * @returns {Promise<void>}
 */
export const downloadResume = async (downloadFunction, params, filename = 'resume.pdf') => {
    try {
        const result = await downloadFunction(params);
        
        if (result instanceof Blob) {
            // Handle blob response (generated PDFs)
            downloadBlob(result, filename);
        } else if (typeof result === 'string') {
            // Handle URL response (absolute or relative file URLs)
            downloadFromUrl(result, filename);
        } else {
            throw new Error('Invalid download response format');
        }
    } catch (error) {
        console.error('Download failed:', error);
        
        // Provide user-friendly error message
        let errorMessage = 'Failed to download resume. Please try again.';
        
        if (error.message === 'Resume not found') {
            errorMessage = 'Resume not found. It may have been deleted.';
        } else if (error.message === 'Access denied. Please log in.') {
            errorMessage = 'Please log in to download your resume.';
        } else if (error.message.includes('Network Error')) {
            errorMessage = 'Network error. Please check your connection and try again.';
        }
        
        throw new Error(errorMessage);
    }
};
