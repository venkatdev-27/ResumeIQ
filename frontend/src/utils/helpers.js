import { AUTH_STORAGE_KEY, AUTH_TOKEN_STORAGE_KEY, DEFAULT_RESUME_FORM, createEmptyResumeData } from './constants';

export const safeJsonParse = (value, fallback = null) => {
    try {
        return JSON.parse(value);
    } catch (_error) {
        return fallback;
    }
};

export const unwrapApiPayload = (payload) => {
    if (!payload) {
        return {};
    }
    return payload.data ?? payload;
};

export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
    const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.details ||
        error?.message;

    if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
    }
    return fallback;
};

export const getAuthToken = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token && typeof token === 'string') {
        return token;
    }

    // Backward compatibility for previous object/session storage.
    const legacyRaw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!legacyRaw) {
        return null;
    }
    const legacySession = safeJsonParse(legacyRaw, null);
    return legacySession?.token || null;
};

export const setAuthToken = (token) => {
    if (typeof window === 'undefined') {
        return;
    }
    if (!token) {
        return;
    }
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
};

export const clearAuthToken = () => {
    if (typeof window === 'undefined') {
        return;
    }
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const normalizeStringList = (value) => {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split(/[\n,]/g)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};

export const normalizeSuggestionList = (value) => {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value.map((item, index) => {
            if (typeof item === 'string') {
                return { id: `suggestion-${index}`, text: item };
            }
            return {
                id: item.id || `suggestion-${index}`,
                text: item.text || item.message || item.suggestion || 'Actionable improvement',
            };
        });
    }
    if (typeof value === 'string') {
        return [{ id: 'suggestion-0', text: value }];
    }
    return [];
};

export const resumeFormToText = (form) => {
    if (!form) {
        return '';
    }

    const sections = [
        `Name: ${form.fullName || ''}`.trim(),
        `Title: ${form.title || ''}`.trim(),
        `Email: ${form.email || ''}`.trim(),
        `Phone: ${form.phone || ''}`.trim(),
        `Location: ${form.location || ''}`.trim(),
        `Summary: ${form.summary || ''}`.trim(),
        `Skills: ${form.skills || ''}`.trim(),
        `Experience: ${form.experience || ''}`.trim(),
        `Education: ${form.education || ''}`.trim(),
    ];

    return sections.filter((line) => !line.endsWith(':')).join('\n');
};

export const mapParsedResumeToForm = (parsed = {}) => {
    if (!parsed || typeof parsed !== 'object') {
        return { ...DEFAULT_RESUME_FORM };
    }

    const personal = parsed.personal || parsed.personalInfo || parsed.contact || {};
    const skills = parsed.skills || parsed.skillset || [];
    const experience = parsed.experience || parsed.workExperience || [];
    const education = parsed.education || parsed.academics || [];

    const mapped = {
        fullName: personal.fullName || personal.name || parsed.fullName || '',
        email: personal.email || parsed.email || '',
        phone: personal.phone || personal.mobile || parsed.phone || '',
        location: personal.location || personal.address || parsed.location || '',
        title: parsed.title || parsed.role || '',
        summary: parsed.summary || parsed.objective || '',
        skills: Array.isArray(skills) ? skills.join(', ') : String(skills || ''),
        experience: Array.isArray(experience)
            ? experience
                  .map((item) => {
                      if (typeof item === 'string') {
                          return item;
                      }
                      return `${item.role || item.title || 'Role'} - ${item.company || 'Company'} (${item.duration || 'Duration'})`;
                  })
                  .join('\n')
            : String(experience || ''),
        education: Array.isArray(education)
            ? education
                  .map((item) => {
                      if (typeof item === 'string') {
                          return item;
                      }
                      return `${item.degree || 'Degree'} - ${item.institute || item.school || 'Institute'} (${item.year || 'Year'})`;
                  })
                  .join('\n')
            : String(education || ''),
    };

    return { ...DEFAULT_RESUME_FORM, ...mapped };
};

export const splitCommaText = (value = '') =>
    String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

export const toMultilineText = (items = [], mapper = (item) => item) =>
    (items || [])
        .map((item) => mapper(item))
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .join('\n');

export const resumeDataToForm = (resumeData) => {
    const data = resumeData || createEmptyResumeData();
    const personal = data.personalDetails || {};

    return {
        ...DEFAULT_RESUME_FORM,
        fullName: personal.fullName || '',
        email: personal.email || '',
        phone: personal.phone || '',
        location: personal.location || '',
        title: personal.title || '',
        summary: personal.summary || '',
        skills: (data.skills || []).join(', '),
        experience: toMultilineText(data.workExperience, (item) =>
            [item.role, item.company, item.startDate && item.endDate ? `(${item.startDate} - ${item.endDate})` : '', item.description]
                .filter(Boolean)
                .join(' '),
        ),
        education: toMultilineText(data.education, (item) =>
            [item.degree, item.institution, item.startYear && item.endYear ? `(${item.startYear} - ${item.endYear})` : '', item.description]
                .filter(Boolean)
                .join(' '),
        ),
    };
};

export const formToResumeData = (form) => {
    const base = createEmptyResumeData();
    const sections = String(form.experience || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((description) => ({
            company: '',
            role: '',
            startDate: '',
            endDate: '',
            description,
        }));

    const education = String(form.education || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((description) => ({
            institution: '',
            degree: '',
            startYear: '',
            endYear: '',
            description,
        }));

    return {
        ...base,
        personalDetails: {
            ...base.personalDetails,
            fullName: form.fullName || '',
            email: form.email || '',
            phone: form.phone || '',
            location: form.location || '',
            title: form.title || '',
            summary: form.summary || '',
        },
        workExperience: sections.length ? sections : base.workExperience,
        education: education.length ? education : base.education,
        skills: splitCommaText(form.skills),
    };
};

export const formatBytes = (bytes = 0) => {
    if (!bytes) {
        return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
};
