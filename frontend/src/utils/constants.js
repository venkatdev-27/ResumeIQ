const resolveBaseUrl = () => {
    const envBaseUrl = String(
        import.meta.env.VITE_API_URL ||
            import.meta.env.VITE_API_BASE_URL ||
            import.meta.env.VITE_BASE_URL ||
            '',
    ).trim();
    if (envBaseUrl) {
        return envBaseUrl.replace(/\/+$/, '');
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }

    return 'http://localhost:5000';
};

const baseurl = resolveBaseUrl();

export const API_BASE_URL = baseurl.endsWith('/api') ? baseurl : `${baseurl}/api`;
export const API_TIMEOUT = 30000;

export const AUTH_STORAGE_KEY = 'ats_resume_auth';
export const AUTH_TOKEN_STORAGE_KEY = 'ats_resume_jwt';
export const RESUME_DRAFT_STORAGE_KEY = 'ats_resume_draft';

export const ROUTES = {
    home: '/',
    templates: '/templates',
    login: '/login',
    register: '/register',
    resumeBuilder: '/resume-builder',
    resumePreview: '/resume-preview',
    atsScanner: '/ats-scanner',
    atsResults: '/ats-results',
    atsImprovements: '/ats-improvements',
};

export const TEMPLATE_TYPES = {
    one: 'template1',
    two: 'template2',
    template1: 'template1',
    template2: 'template2',
    template3: 'template3',
    template4: 'template4',
    template5: 'template5',
    template6: 'template6',
    template7: 'template7',
    template8: 'template8',
    template9: 'template9',
    template10: 'template10',
};

export const DEFAULT_RESUME_FORM = {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    title: '',
    summary: '',
    skills: '',
    experience: '',
    education: '',
};

export const createEmptyResumeData = () => ({
    personalDetails: {
        fullName: '',
        email: '',
        phone: '',
        location: '',
        title: '',
        summary: '',
        linkedin: '',
        website: '',
    },
    workExperience: [
        {
            company: '',
            role: '',
            startDate: '',
            endDate: '',
            description: '',
        },
    ],
    projects: [
        {
            name: '',
            techStack: '',
            link: '',
            description: '',
        },
    ],
    internships: [],
    education: [
        {
            institution: '',
            degree: '',
            startYear: '',
            endYear: '',
            description: '',
        },
    ],
    skills: [],
    certifications: [],
    achievements: [],
    hobbies: [],
});

export const TEMPLATE_OPTIONS = [
    { id: TEMPLATE_TYPES.template1, name: 'Template 1', tone: 'Classic Professional' },
    { id: TEMPLATE_TYPES.template2, name: 'Template 2', tone: 'Modern Highlight' },
    { id: TEMPLATE_TYPES.template3, name: 'Template 3', tone: 'Sidebar Layout' },
    { id: TEMPLATE_TYPES.template4, name: 'Template 4', tone: 'Minimal Elegant' },
    { id: TEMPLATE_TYPES.template5, name: 'Template 5', tone: 'Corporate Grid' },
    { id: TEMPLATE_TYPES.template6, name: 'Template 6', tone: 'Compact ATS' },
    { id: TEMPLATE_TYPES.template7, name: 'Template 7', tone: 'Executive Clean' },
    { id: TEMPLATE_TYPES.template8, name: 'Template 8', tone: 'Creative Balanced' },
    { id: TEMPLATE_TYPES.template9, name: 'Template 9', tone: 'Neutral Monochrome' },
    { id: TEMPLATE_TYPES.template10, name: 'Template 10', tone: 'Structured Impact' },
];
