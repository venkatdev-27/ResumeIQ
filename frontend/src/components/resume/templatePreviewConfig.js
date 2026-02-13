import TemplateOne from './TemplateOne';
import TemplateTwo from './TemplateTwo';
import TemplateThree from './TemplateThree';
import TemplateFour from './TemplateFour';
import TemplateFive from './TemplateFive';
import TemplateSix from './TemplateSix';
import TemplateSeven from './TemplateSeven';
import TemplateEight from './TemplateEight';
import TemplateNine from './TemplateNine';
import TemplateTen from './TemplateTen';

export const TEMPLATE_COMPONENT_MAP = {
    template1: TemplateOne,
    template2: TemplateTwo,
    template3: TemplateThree,
    template4: TemplateFour,
    template5: TemplateFive,
    template6: TemplateSix,
    template7: TemplateSeven,
    template8: TemplateEight,
    template9: TemplateNine,
    template10: TemplateTen,
};

const hasText = (value) => Boolean(String(value ?? '').trim());

const hasListValues = (value = []) =>
    Array.isArray(value) && value.some((item) => hasText(item));

const hasEntryValues = (value = [], keys = []) =>
    Array.isArray(value) &&
    value.some((item) => keys.some((key) => hasText(item?.[key])));

export const hasMeaningfulResumeData = (resumeData = {}) => {
    if (!resumeData || typeof resumeData !== 'object') {
        return false;
    }

    const personal = resumeData.personalDetails || {};
    const hasPersonal = [
        personal.fullName,
        personal.title,
        personal.summary,
        personal.email,
        personal.phone,
        personal.location,
        personal.linkedin,
        personal.website,
    ].some(hasText);

    return (
        hasPersonal ||
        hasEntryValues(resumeData.workExperience, ['company', 'role', 'description', 'startDate', 'endDate']) ||
        hasEntryValues(resumeData.projects, ['name', 'techStack', 'description', 'link']) ||
        hasEntryValues(resumeData.internships, ['company', 'role', 'description', 'startDate', 'endDate']) ||
        hasEntryValues(resumeData.education, ['institution', 'degree', 'description', 'startYear', 'endYear']) ||
        hasListValues(resumeData.skills) ||
        hasListValues(resumeData.certifications) ||
        hasListValues(resumeData.achievements) ||
        hasListValues(resumeData.hobbies)
    );
};

export const PREVIEW_RESUME_DATA = {
    personalDetails: {
        fullName: 'Alex Morgan',
        title: 'Senior Full Stack Developer',
        email: 'alex.morgan@email.com',
        phone: '+1 (555) 210-9876',
        location: 'Austin, TX',
        summary:
            'Senior Full Stack Developer with 5+ years of experience building ATS-friendly web products using React, Node.js, and cloud tooling. Focused on scalable architecture, measurable impact, and fast delivery.',
        linkedin: 'linkedin.com/in/alexmorgan',
        website: 'alexmorgan.dev',
        photo: '',
    },
    workExperience: [
        {
            company: 'ResumeIQ Technologies',
            role: 'Senior Full Stack Developer',
            startDate: 'Jan 2024',
            endDate: 'Present',
            description:
                'Led development of resume builder and ATS scanner modules for high-traffic users.\nImproved end-to-end resume analysis speed by 38% through API and query optimization.\nMentored 4 developers and established reusable UI and validation patterns.',
        },
        {
            company: 'Nexa Labs',
            role: 'Software Engineer',
            startDate: 'Mar 2022',
            endDate: 'Dec 2023',
            description:
                'Built reusable frontend components for dashboard and profile workflows.\nReduced API response time by 35% with caching and optimized request handling.\nDelivered 6 production features in collaboration with product and design teams.',
        },
        
    ],
    projects: [
        {
            name: 'ResumeIQ Builder Platform',
            techStack: 'React, Node.js, MongoDB, Tailwind',
            link: 'github.com/alexmorgan/smart-resume-builder',
            description:
                'Built ATS-friendly resume generation flow with 10 responsive templates.\nImplemented live preview, autosave, and PDF export with format-safe layouts.\nAdded section-wise form validation and multi-step resume completion tracking.',
        },
        {
            name: 'ATS Insight Dashboard',
            techStack: 'React, Redux Toolkit, Express, Chart.js',
            link: 'taskflow-demo.vercel.app',
            description:
                'Designed ATS score dashboard with keyword match, section health, and improvement actions.\nAdded animated progress indicators and structured scoring summaries for better UX.\nImproved render performance by optimizing state subscriptions and memoized selectors.',
        },
        {
            name: 'Job Match API Service',
            techStack: 'Node.js, Express, PostgreSQL, Redis',
            link: 'github.com/alexmorgan/job-match-api',
            description:
                'Created backend service for job-to-resume keyword scoring and ranking.\nImplemented caching and rate limits for stable performance under burst traffic.\nDocumented API contracts and integrated monitoring for error visibility.',
        },
    ],
    internships: [
        {
            company: 'CodeBridge',
            role: 'Software Intern',
            startDate: 'Jan 2021',
            endDate: 'Jun 2021',
            description:
                'Implemented internal admin modules and fixed cross-browser UI regressions.\nImproved form validation and error handling across key onboarding flows.\nDocumented API usage and onboarding notes for new engineering interns.',
        },
    ],
    education: [
        {
            institution: 'State University',
            degree: 'B.Tech in Computer Science',
            startYear: '22',
            endYear: '25',
            description: '',
        },
        {
            institution: 'City Tech Institute',
            degree: 'Higher Secondary (Science)',
            startYear: '20',
            endYear: '22',
            description: '',
        },
    ],
    skills: [
        'Programming Languages: JavaScript, TypeScript, Python',
        'Frontend: React, Next.js, HTML5, CSS3, Tailwind CSS',
        'Backend: Node.js, Express, REST APIs, JWT Authentication',
        'Database: MongoDB, PostgreSQL, MySQL',
        'DevOps & Tools: Git, GitHub Actions, Docker, Postman, AWS EC2',
    ],
    certifications: [
        'AWS Cloud Practitioner',
        'Meta Front-End Developer',
    ],
    achievements: [
        'Top 5 Finalist - University Hackathon',
        'Employee Spotlight Award - Q3 2024',
    ],
    hobbies: ['Open-source contribution', 'Technical blogging', 'Mentoring junior developers', 'UI/UX case study reading'],
};

export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;
