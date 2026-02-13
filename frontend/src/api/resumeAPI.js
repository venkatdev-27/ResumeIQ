import axiosInstance from './axiosInstance';

const ALLOWED_FILE_TYPES = new Set(['application/pdf']);

const validateFileType = (file) => {
    if (!file) {
        throw new Error('Please select a resume PDF file.');
    }
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
        throw new Error('Only PDF files are allowed.');
    }
};

export const uploadResumeAPI = async (file, options = {}) => {
    validateFileType(file);

    const { resumeText = '', templateName = '', resumeData = null } = options;

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('resumeText', resumeText);
    if (templateName) {
        formData.append('templateName', templateName);
    }
    if (resumeData) {
        formData.append('resumeData', JSON.stringify(resumeData));
    }

    const response = await axiosInstance.post('/resume/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const saveResumeBuilderAPI = async (payload) => {
    const response = await axiosInstance.post('/resume/upload', payload);
    return response.data;
};

export const generateResumePdfAPI = async ({ html, fileName = 'resume.pdf' }) => {
    const response = await axiosInstance.post(
        '/resume/generate-pdf',
        { html, fileName },
        {
            responseType: 'blob',
        },
    );

    return response.data;
};

// NEW: Download existing resume by ID
export const downloadResumeAPI = async (resumeId) => {
    try {
        const response = await axiosInstance.get(`/resume/download/${resumeId}`, {
            responseType: 'blob',
        });
        return response.data;
    } catch (error) {
        // Handle specific error cases
        if (error.response?.status === 404) {
            throw new Error('Resume not found');
        }
        if (error.response?.status === 403) {
            throw new Error('Access denied. Please log in.');
        }
        throw new Error('Failed to download resume. Please try again.');
    }
};