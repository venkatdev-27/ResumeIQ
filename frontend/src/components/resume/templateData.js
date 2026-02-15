const clean = (value) => String(value ?? '').trim();
const cleanOneLine = (value) =>
    String(value ?? '')
        .replace(/\r\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeMultiline = (value) =>
    clean(value)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

const normalizeSummaryText = (text) => {
    if (!text) {
        return '';
    }

    const normalizedText = normalizeMultiline(text)
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!normalizedText) {
        return '';
    }

    return /[.!?]$/.test(normalizedText) ? normalizedText : `${normalizedText}.`;
};

const sentence = (value = '') => {
    const line = cleanOneLine(value);
    if (!line) {
        return '';
    }
    return /[.!?]$/.test(line) ? line : `${line}.`;
};

const BULLET_STRONG_ENDINGS = [
    'excellence',
    'resilience',
    'precision',
    'reliability',
    'scalability',
    'stability',
    'efficiency',
    'maintainability',
    'performance',
    'readiness',
    'assurance',
    'consistency',
];

const BULLET_WEAK_ENDINGS = new Set([
    'and',
    'or',
    'with',
    'through',
    'for',
    'to',
    'of',
    'in',
    'on',
    'at',
    'by',
    'as',
    'from',
    'into',
    'using',
    'via',
]);

const hashSeed = (value = '') =>
    [...String(value || '')].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);

const pickVariant = (variants = [], seed = 0) => {
    const pool = Array.isArray(variants) ? variants.filter(Boolean) : [];
    if (!pool.length) {
        return '';
    }
    return pool[Math.abs(Number(seed) || 0) % pool.length];
};

const pickStrongBulletEnding = (seedValue = 0) =>
    BULLET_STRONG_ENDINGS[Math.abs(Number(seedValue) || 0) % BULLET_STRONG_ENDINGS.length];

const enforceStrongBulletEnding = (value = '', seedValue = 0) => {
    const base = cleanOneLine(value).replace(/^[\u2022*-]\s*/g, '').replace(/[.!?]+$/g, '').trim();
    if (!base) {
        return '';
    }

    const tokens = base.split(/\s+/).filter(Boolean);
    if (!tokens.length) {
        return '';
    }

    const lastIndex = tokens.length - 1;
    const lastTokenKey = String(tokens[lastIndex] || '')
        .toLowerCase()
        .replace(/[^a-z0-9%-]/g, '');
    if (!lastTokenKey || BULLET_WEAK_ENDINGS.has(lastTokenKey) || /ing$/.test(lastTokenKey)) {
        tokens[lastIndex] = pickStrongBulletEnding(seedValue);
    }

    return `${tokens.join(' ').replace(/[,.!?;:]+$/g, '')}.`;
};

const normalizeBulletForA4 = (value = '', maxChars = 92, seedValue = 0) => {
    const safeMaxChars = Math.max(40, Number(maxChars) || 92);
    let candidate = enforceStrongBulletEnding(value, seedValue);
    if (!candidate) {
        return '';
    }

    while (candidate.length > safeMaxChars) {
        const withoutEnding = candidate.replace(/[.!?]+$/g, '').trim();
        const tokens = withoutEnding.split(/\s+/).filter(Boolean);
        if (tokens.length <= 1) {
            break;
        }
        tokens.pop();
        candidate = enforceStrongBulletEnding(tokens.join(' '), seedValue);
        if (!candidate) {
            break;
        }
    }

    return candidate;
};

const buildSummaryFallback = (source = {}) => {
    const personal = source?.personalDetails || {};
    const title = clean(personal.title) || 'Professional';
    const work = Array.isArray(source?.workExperience) ? source.workExperience : [];
    const projects = Array.isArray(source?.projects) ? source.projects : [];
    const internships = Array.isArray(source?.internships) ? source.internships : [];

    const firstWork = work[0] || {};
    const firstProject = projects[0] || {};
    const firstInternship = internships[0] || {};

    const contextRole = clean(firstWork.role || firstInternship.role) || title;
    const contextCompany = clean(firstWork.company || firstInternship.company) || 'assigned teams';
    const contextProject = clean(firstProject.name) || 'delivery initiatives';

    const lines = [
        sentence(`${title} delivers role-aligned outcomes with accountable implementation and consistent execution quality`),
        sentence(`Contributes as ${contextRole} with structured ownership in ${contextCompany} responsibilities`),
        sentence(`Builds measurable value through ${contextProject} using practical, maintainable engineering practices`),
        sentence('Communicates progress clearly and sustains reliable delivery through validation and collaboration'),
    ].filter(Boolean);

    return lines.join(' ');
};

const buildWorkFallbackDescription = (item = {}, itemIndex = 0) => {
    const role = clean(item.role) || 'Role';
    const company = clean(item.company) || 'organization';
    const seed = hashSeed(`${role}|${company}|work|${itemIndex}`);
    const ownershipMetric = 10 + (seed % 17);
    const lineTwo = pickVariant(
        [
            `Orchestrated ${role} assignments at ${company}, improving cycle reliability by ${ownershipMetric}% through governance`,
            `Coordinated ${role} deliverables at ${company}, reducing rework by ${ownershipMetric}% via validation`,
            `Delivered ${role} outcomes at ${company}, increasing execution predictability by ${ownershipMetric}% through instrumentation`,
        ],
        seed + 1,
    );
    const lineThree = pickVariant(
        [
            'Elevated handoff clarity with validated documentation, risk triage, and release-confidence discipline',
            'Strengthened delivery assurance with defect-prevention controls, traceable evidence, and milestone accountability',
            'Maintained operational continuity through systematic verification, escalation hygiene, and measurable closure',
        ],
        seed + 2,
    );

    return [
        sentence(`Directed ${role} responsibilities at ${company} with accountable execution and dependable outcomes`),
        enforceStrongBulletEnding(lineTwo, seed + 3),
        enforceStrongBulletEnding(lineThree, seed + 4),
    ].join('\n');
};

const buildProjectFallbackDescription = (item = {}, itemIndex = 0) => {
    const name = clean(item.name) || 'Project';
    const seed = hashSeed(`${name}|project|${itemIndex}`);
    const projectAlias = pickVariant(['the platform', 'the solution', 'the application'], seed + 21);
    const performanceGain = 12 + (seed % 19);
    const reliabilityGain = 8 + ((seed + 7) % 21);
    const leadLine = pickVariant(
        [
            `Architected ${name} delivery workflows, increasing release velocity by ${performanceGain}% through disciplined orchestration and accountable execution`,
            `Engineered ${name} solution pathways, raising delivery throughput by ${performanceGain}% through measured optimization and dependable coordination`,
            `Implemented ${name} capability streams, improving execution efficiency by ${performanceGain}% through structured planning and resilient governance`,
        ],
        seed + 31,
    );
    const lineTwo = pickVariant(
        [
            `Refined ${projectAlias} architecture decisions, reducing response latency by ${performanceGain}% through traceable iteration and rigorous validation`,
            `Optimized ${projectAlias} processing flows, improving throughput by ${performanceGain}% through benchmarked refinement and proactive quality controls`,
            `Strengthened ${projectAlias} execution paths, lowering operational overhead by ${performanceGain}% with systematic analysis and precise remediation`,
        ],
        seed + 1,
    );
    const lineThree = pickVariant(
        [
            `Elevated ${projectAlias} quality safeguards, increasing defect-resolution efficiency by ${reliabilityGain}% with robust observability and risk governance`,
            `Hardened ${projectAlias} release-readiness, improving deployment reliability by ${reliabilityGain}% through controlled validation and continuity planning`,
            `Enhanced ${projectAlias} verification coverage, improving production resilience by ${reliabilityGain}% with auditable safeguards and operational discipline`,
        ],
        seed + 2,
    );

    return [
        enforceStrongBulletEnding(leadLine, seed + 3),
        enforceStrongBulletEnding(lineTwo, seed + 4),
        enforceStrongBulletEnding(lineThree, seed + 5),
    ].join('\n');
};

const buildInternshipFallbackDescription = (item = {}, itemIndex = 0) => {
    const role = clean(item.role) || 'Intern';
    const company = clean(item.company) || 'organization';
    const seed = hashSeed(`${role}|${company}|internship|${itemIndex}`);
    const deliveryGain = 9 + (seed % 16);
    const lineTwo = pickVariant(
        [
            `Supported ${company} initiatives by translating requirements into implementation-ready tasks with traceability`,
            `Contributed to ${company} deliverables through structured analysis, tooling support, and disciplined validation`,
            `Assisted ${company} teams with execution updates, quality checkpoints, and documentation continuity`,
        ],
        seed + 1,
    );
    const lineThree = pickVariant(
        [
            `Improved task completion velocity by ${deliveryGain}% through defect triage and verification discipline`,
            `Increased execution consistency by ${deliveryGain}% using documented updates and milestone accountability`,
            `Raised delivery quality by ${deliveryGain}% with proactive escalation and closure validation`,
        ],
        seed + 2,
    );

    return [
        sentence(`Executed ${role} tasks at ${company} with accountable ownership and delivery consistency`),
        enforceStrongBulletEnding(lineTwo, seed + 3),
        enforceStrongBulletEnding(lineThree, seed + 4),
    ].join('\n');
};

const summaryToParagraph = (value = '') =>
    cleanOneLine(String(value || '').replace(/\n+/g, ' '));

const hasAnyValue = (item, keys = []) => keys.some((key) => Boolean(clean(item?.[key])));

const normalizeStringList = (value) =>
    Array.isArray(value)
        ? value.map((item) => cleanOneLine(item)).filter(Boolean)
        : [];

const dedupeLines = (value = []) => {
    const seen = new Set();
    return (Array.isArray(value) ? value : [])
        .map((item) => cleanOneLine(item))
        .filter((item) => {
            if (!item) {
                return false;
            }

            const key = item.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
};

const DUMMY_BULLET_PATTERNS = [
    /\bdummy\b/i,
    /\bplaceholder\b/i,
    /\btemplate\b/i,
    /\blorem\b/i,
    /\bipsum\b/i,
    /\betc\b/i,
    /\bmisc\b/i,
    /\bvarious\b/i,
];

const toBulletKey = (value = '') =>
    cleanOneLine(value)
        .toLowerCase()
        .replace(/[.!?]+$/g, '')
        .replace(/[^a-z0-9%\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const isDummyBulletLine = (value = '') => {
    const line = cleanOneLine(value);
    if (!line) {
        return true;
    }
    return DUMMY_BULLET_PATTERNS.some((pattern) => pattern.test(line));
};

const splitDescriptionLines = (value = '') =>
    normalizeMultiline(value)
        .split('\n')
        .map((line) => cleanOneLine(line).replace(/^[\u2022*-]\s*/g, '').trim())
        .filter(Boolean);

const buildPreviewUniqueLine = ({ section = 'experience', context = '', seed = 0, lineIndex = 0 }) => {
    const contextLabel = cleanOneLine(context) || section;
    const metric = 9 + ((Math.abs(seed) + lineIndex * 3) % 22);
    const line = pickVariant(
        [
            `Engineered ${contextLabel} execution flow, improving delivery reliability by ${metric}% through disciplined validation and governance`,
            `Optimized ${contextLabel} implementation lifecycle, reducing avoidable rework by ${metric}% with measurable controls and traceability`,
            `Strengthened ${contextLabel} release quality, improving outcome consistency by ${metric}% through structured checkpoints and accountability`,
        ],
        seed + lineIndex,
    );
    return enforceStrongBulletEnding(line, seed + lineIndex + 41);
};

const enforceLivePreviewBulletQuality = (items = [], options = {}) => {
    const { section = 'experience', contextFields = [] } = options || {};
    const globalKeys = new Set();

    return (Array.isArray(items) ? items : []).map((item = {}, itemIndex = 0) => {
        const descriptionLines = splitDescriptionLines(item.description);
        const context = contextFields
            .map((field) => clean(item?.[field]))
            .filter(Boolean)
            .join(' ');
        const seed = hashSeed(`${section}|${context}|${itemIndex}`);
        const accepted = [];
        const localKeys = new Set();

        const tryPush = (line) => {
            const normalized = enforceStrongBulletEnding(line, seed + accepted.length);
            const key = toBulletKey(normalized);
            if (!key || isDummyBulletLine(normalized) || localKeys.has(key) || globalKeys.has(key)) {
                return false;
            }
            accepted.push(normalized);
            localKeys.add(key);
            globalKeys.add(key);
            return true;
        };

        descriptionLines.forEach((line) => {
            tryPush(line);
        });

        let cursor = 0;
        while (accepted.length < 3 && cursor < 12) {
            const generated = buildPreviewUniqueLine({
                section,
                context: context || section,
                seed: seed + cursor,
                lineIndex: accepted.length,
            });
            tryPush(generated);
            cursor += 1;
        }

        return {
            ...item,
            description: accepted.slice(0, 3).join('\n'),
        };
    });
};

const A4_BULLET_MAX_CHARS = 78;
const A4_BULLET_MIN_CHARS = 74;
const A4_BULLET_PADDING_TOKENS = [
    'with',
    'measurable',
    'outcomes',
    'through',
    'structured',
    'execution',
    'and',
    'reliable',
    'delivery',
];

const fitBulletLineForA4 = (value = '', maxChars = A4_BULLET_MAX_CHARS) => {
    const compact = cleanOneLine(value).replace(/^[\u2022*-]\s*/g, '');
    if (!compact) {
        return '';
    }

    const safeMaxChars = Math.max(40, Number(maxChars) || A4_BULLET_MAX_CHARS);
    const words = compact.split(' ').filter(Boolean);
    if (!words.length) {
        return '';
    }

    let fitted = words.join(' ');
    while (fitted.length > safeMaxChars && words.length > 1) {
        words.pop();
        fitted = words.join(' ');
    }

    const compacted = fitted
        .replace(/\s+([,.;:!?])/g, '$1')
        .replace(/[,:;]+$/g, '')
        .trim();
    return normalizeBulletForA4(compacted, safeMaxChars, hashSeed(compacted));
};

const padBulletLineForA4 = (
    value = '',
    options = {
        minChars: A4_BULLET_MIN_CHARS,
        maxChars: A4_BULLET_MAX_CHARS,
    },
) => {
    const { minChars = A4_BULLET_MIN_CHARS, maxChars = A4_BULLET_MAX_CHARS } = options || {};
    const safeMaxChars = Math.max(40, Number(maxChars) || A4_BULLET_MAX_CHARS);
    const safeMinChars = Math.max(60, Math.min(safeMaxChars - 2, Number(minChars) || A4_BULLET_MIN_CHARS));
    const fitted = fitBulletLineForA4(value, safeMaxChars);
    if (!fitted) {
        return '';
    }

    let tokens = fitted.split(' ').filter(Boolean);
    let padded = tokens.join(' ');
    const used = new Set(tokens.map((token) => token.toLowerCase()));
    let cursor = 0;

    while (padded.length < safeMinChars && cursor < A4_BULLET_PADDING_TOKENS.length * 3) {
        const candidate = A4_BULLET_PADDING_TOKENS[cursor % A4_BULLET_PADDING_TOKENS.length];
        cursor += 1;
        const key = String(candidate || '').toLowerCase();
        if (!key || used.has(key)) {
            continue;
        }
        const next = `${padded} ${candidate}`.trim();
        if (next.length > safeMaxChars) {
            break;
        }
        tokens.push(candidate);
        used.add(key);
        padded = tokens.join(' ');
    }

    return normalizeBulletForA4(padded, safeMaxChars, hashSeed(`${padded}|${value}`));
};

const finalizeA4BulletLines = (lines = [], fallback = [], maxLines = 3) =>
    ensureBulletLines(
        (Array.isArray(lines) ? lines : []).map((line) => padBulletLineForA4(line)).filter(Boolean),
        (Array.isArray(fallback) ? fallback : []).map((line) => padBulletLineForA4(line)).filter(Boolean),
        maxLines,
    )
        .map((line) => padBulletLineForA4(line))
        .filter(Boolean);

const clampBulletLineCount = (value = 3) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return 3;
    }

    return Math.max(3, Math.min(3, Math.round(parsed)));
};

const ensureBulletLines = (lines = [], fallback = [], maxLines = 3) => {
    const targetLines = clampBulletLineCount(maxLines);
    const base = dedupeLines(lines).slice(0, targetLines);
    const fallbackLines = dedupeLines(fallback);
    const merged = dedupeLines([...base, ...fallbackLines]);

    if (!merged.length) {
        return [];
    }

    const fixed = [...merged];
    const seed = [...merged];
    let cursor = 0;
    while (fixed.length < targetLines && seed.length) {
        fixed.push(seed[cursor % seed.length]);
        cursor += 1;
    }

    return fixed.slice(0, targetLines);
};

export const joinNonEmpty = (values = [], separator = ' | ') =>
    (Array.isArray(values) ? values : [])
        .map((item) => clean(item))
        .filter(Boolean)
        .join(separator);

export const formatDateRange = (startDate, endDate, separator = ' - ') =>
    joinNonEmpty([startDate, endDate], separator);

const normalizePersonalDetails = (value = {}, source = {}) => {
    const summary = summaryToParagraph(normalizeSummaryText(value.summary));
    return {
        fullName: clean(value.fullName),
        title: clean(value.title),
        email: clean(value.email),
        phone: clean(value.phone),
        location: clean(value.location),
        summary: summary || buildSummaryFallback(source),
        linkedin: clean(value.linkedin),
        website: clean(value.website),
        photo: clean(value.photo),
    };
};

const normalizeWorkExperience = (value = []) =>
    (Array.isArray(value) ? value : [])
        .map((item = {}, index) => ({
            company: clean(item.company),
            role: clean(item.role),
            startDate: clean(item.startDate),
            endDate: clean(item.endDate),
            description: normalizeMultiline(item.description) || buildWorkFallbackDescription(item, index),
            bulletMaxLines: 3,
        }))
        .filter((item) => hasAnyValue(item, ['company', 'role', 'startDate', 'endDate', 'description']))
        .slice(0, 3);

const normalizeProjects = (value = []) =>
    (Array.isArray(value) ? value : [])
        .map((item = {}, index) => ({
            name: clean(item.name),
            techStack: clean(item.techStack),
            link: clean(item.link),
            description: normalizeMultiline(item.description) || buildProjectFallbackDescription(item, index),
            bulletMaxLines: 3,
        }))
        .filter((item) => hasAnyValue(item, ['name', 'techStack', 'link', 'description']));

const normalizeInternships = (value = []) =>
    (Array.isArray(value) ? value : [])
        .map((item = {}, index) => ({
            company: clean(item.company),
            role: clean(item.role),
            startDate: clean(item.startDate),
            endDate: clean(item.endDate),
            description: normalizeMultiline(item.description) || buildInternshipFallbackDescription(item, index),
            bulletMaxLines: 3,
        }))
        .filter((item) => hasAnyValue(item, ['company', 'role', 'startDate', 'endDate', 'description']));

const resolveVisibleExperience = (workExperience = [], internships = []) => {
    if (Array.isArray(workExperience) && workExperience.length > 0) {
        return workExperience;
    }

    if (Array.isArray(internships) && internships.length > 0) {
        return internships.map((item) => ({
            ...item,
            role: clean(item.role),
            bulletMaxLines: 3,
        }));
    }

    return [];
};

const normalizeEducation = (value = []) =>
    (Array.isArray(value) ? value : [])
        .map((item = {}) => ({
            institution: clean(item.institution),
            degree: clean(item.degree),
            startYear: clean(item.startYear),
            endYear: clean(item.endYear),
            description: normalizeMultiline(item.description),
        }))
        .filter((item) => hasAnyValue(item, ['institution', 'degree', 'startYear', 'endYear']));

const applyBulletCompression = (items = []) =>
    (Array.isArray(items) ? items : []).map((item) => ({
        ...item,
        bulletMaxLines: 3,
    }));

export const getTemplateData = (resumeData = {}) => {
    const workExperience = normalizeWorkExperience(resumeData.workExperience || []);
    const internships = normalizeInternships(resumeData.internships || []);
    const visibleExperience = enforceLivePreviewBulletQuality(
        resolveVisibleExperience(workExperience, internships),
        { section: 'experience', contextFields: ['role', 'company'] },
    );
    const projects = enforceLivePreviewBulletQuality(normalizeProjects(resumeData.projects || []), {
        section: 'project',
        contextFields: ['name'],
    });
    const cleanedInternships = enforceLivePreviewBulletQuality(internships, {
        section: 'internship',
        contextFields: ['role', 'company'],
    });
    return {
        personalDetails: normalizePersonalDetails(resumeData.personalDetails || {}, resumeData),
        workExperience: applyBulletCompression(visibleExperience),
        projects: applyBulletCompression(projects),
        internships: applyBulletCompression(cleanedInternships),
        education: normalizeEducation(resumeData.education || []),
        skills: normalizeStringList(resumeData.skills),
        certifications: normalizeStringList(resumeData.certifications),
        achievements: normalizeStringList(resumeData.achievements),
        hobbies: normalizeStringList(resumeData.hobbies),
    };
};

const normalizeSkillEntries = (value = []) =>
    normalizeStringList(value)
        .flatMap((item) =>
            normalizeMultiline(item)
                .split('\n')
                .map((line) => clean(line))
                .filter(Boolean),
        )
        .filter(Boolean);

const SKILL_CATEGORY_DEFINITIONS = [
    {
        key: 'frontend',
        label: 'Frontend',
        aliases: ['frontend', 'front end', 'fronend', 'ui', 'client side', 'web ui'],
        keywords: [
            'react',
            'reactjs',
            'next',
            'next.js',
            'nextjs',
            'vue',
            'angular',
            'svelte',
            'html',
            'html5',
            'css',
            'css3',
            'sass',
            'tailwind',
            'tailwindcss',
            'bootstrap',
            'redux',
            'vite',
            'webpack',
            'web development',
            'web developer',
            'responsive design',
        ],
    },
    {
        key: 'backend',
        label: 'Backend',
        aliases: ['backend', 'back end', 'backned', 'server', 'server side'],
        keywords: [
            'node',
            'node.js',
            'nodejs',
            'express',
            'expressjs',
            'nestjs',
            'django',
            'flask',
            'fastapi',
            'spring',
            'spring boot',
            'springboot',
            'laravel',
            'rails',
            '.net',
            'dotnet',
            'asp.net',
            'rest',
            'restful',
            'graphql',
            'api',
            'server',
            'jwt',
            'microservice',
            'microservices',
        ],
    },
    {
        key: 'full_stack',
        label: 'Full Stack',
        aliases: ['full stack', 'fullstack', 'full stack development', 'mern', 'mean', 'mevn', 'pern', 'lamp'],
        keywords: ['full stack', 'fullstack', 'mern', 'mean', 'mevn', 'pern', 'lamp', 'jamstack'],
    },
    {
        key: 'ai_ml',
        label: 'AI/ML',
        aliases: ['ai', 'ml', 'ai/ml', 'aiml', 'machine learning', 'deep learning', 'artificial intelligence', 'genai', 'llm'],
        keywords: [
            'machine learning',
            'deep learning',
            'artificial intelligence',
            'ai',
            'ml',
            'llm',
            'genai',
            'nlp',
            'computer vision',
            'tensorflow',
            'pytorch',
            'keras',
            'transformer',
            'hugging face',
            'langchain',
            'openai',
            'ai engineer',
            'ml engineer',
            'prompt engineering',
            'rag',
        ],
    },
    {
        key: 'data_science',
        label: 'Data Science',
        aliases: ['data science', 'datascience', 'data sceinece', 'data sciencee', 'ml research', 'modeling', 'predictive modeling'],
        keywords: [
            'data science',
            'data visualization',
            'pandas',
            'numpy',
            'scikit',
            'matplotlib',
            'seaborn',
            'jupyter',
            'statistics',
            'predictive modeling',
            'etl',
            'feature engineering',
            'spark',
            'hadoop',
        ],
    },
    {
        key: 'data_analytics',
        label: 'Data Analytics',
        aliases: ['data analytics', 'data analyst', 'analytics', 'business intelligence', 'bi', 'reporting'],
        keywords: [
            'data analytics',
            'data analyst',
            'business intelligence',
            'dashboard',
            'reporting',
            'excel',
            'tableau',
            'power bi',
            'looker',
            'looker studio',
            'google analytics',
            'kpi',
            'etl',
            'sql',
        ],
    },
    {
        key: 'databases',
        label: 'Databases',
        aliases: ['database', 'databases', 'db', 'data stores'],
        keywords: [
            'mongodb',
            'postgres',
            'postgresql',
            'mysql',
            'mariadb',
            'sql',
            'sql server',
            'oracle',
            'snowflake',
            'sqlite',
            'redis',
            'elasticsearch',
            'cassandra',
            'dynamodb',
            'firestore',
            'supabase',
        ],
    },
    {
        key: 'devops',
        label: 'DevOps & Cloud',
        aliases: ['devops', 'dev ops', 'devop', 'deveops', 'infra', 'infrastructure', 'sre', 'platform engineering', 'cloud'],
        keywords: [
            'docker',
            'kubernetes',
            'k8s',
            'jenkins',
            'github actions',
            'gitlab ci',
            'ci/cd',
            'cicd',
            'aws',
            'azure',
            'gcp',
            'terraform',
            'ansible',
            'nginx',
            'linux',
            'bash',
            'shell',
            'prometheus',
            'grafana',
            'devops engineer',
        ],
    },
    {
        key: 'tools',
        label: 'Tools',
        aliases: ['tools', 'tooling', 'platforms'],
        keywords: [
            'git',
            'github',
            'gitlab',
            'bitbucket',
            'postman',
            'jira',
            'notion',
            'slack',
            'vscode',
            'npm',
            'yarn',
            'pnpm',
            'swagger',
            'figma',
        ],
    },
    {
        key: 'testing',
        label: 'Testing',
        aliases: ['testing', 'qa', 'quality assurance', 'test automation'],
        keywords: ['jest', 'vitest', 'cypress', 'selenium', 'playwright', 'mocha', 'chai', 'testing library'],
    },
    {
        key: 'mobile',
        label: 'Mobile',
        aliases: ['mobile', 'android', 'ios'],
        keywords: ['react native', 'flutter', 'android', 'ios', 'swift', 'kotlin', 'xcode'],
    },
    {
        key: 'languages',
        label: 'Languages',
        aliases: ['languages', 'programming languages'],
        keywords: ['javascript', 'typescript', 'python', 'java', 'go', 'c++', 'c#', 'php', 'ruby', 'rust', 'scala'],
    },
    {
        key: 'other',
        label: 'Specialization',
        aliases: ['other', 'others', 'specialization', 'role focus'],
        keywords: [
            'software development',
            'software developer',
            'software engineer',
            'full stack developer',
            'backend developer',
            'frontend developer',
            'data scientist',
            'data analyst',
            'ai engineer',
            'devops engineer',
        ],
    },
];

const SKILL_CATEGORY_ORDER = SKILL_CATEGORY_DEFINITIONS.map((category) => category.key);

const SKILL_CATEGORY_LABELS = Object.fromEntries(
    SKILL_CATEGORY_DEFINITIONS.map((category) => [category.key, category.label]),
);

const SKILL_CATEGORY_ALIASES = Object.fromEntries(
    SKILL_CATEGORY_DEFINITIONS.map((category) => [category.key, category.aliases]),
);

const SKILL_KEYWORDS = Object.fromEntries(
    SKILL_CATEGORY_DEFINITIONS.map((category) => [category.key, category.keywords]),
);

const DATA_SCIENCE_CONTEXT_KEYWORDS = [
    ...SKILL_KEYWORDS.data_science,
    'python',
];

const DATA_ANALYTICS_CONTEXT_KEYWORDS = [
    ...SKILL_KEYWORDS.data_analytics,
];

const AI_CONTEXT_KEYWORDS = [
    ...SKILL_KEYWORDS.ai_ml,
];

const BACKEND_CONTEXT_KEYWORDS = [
    ...SKILL_KEYWORDS.backend,
];

const normalizeSkillToken = (value = '') =>
    clean(value)
        .replace(/^[\u2022*-]+\s*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const toCanonicalSkillKey = (value = '') =>
    normalizeSkillToken(value)
        .toLowerCase()
        .replace(/c\+\+/g, 'cpp')
        .replace(/c#/g, 'csharp')
        .replace(/\.net/g, 'dotnet')
        .replace(/\b(react|next|vue|node|express|nestjs|angular|svelte)\s*\.?\s*js\b/g, '$1')
        .replace(/\brest\s*apis?\b/g, 'restapi')
        .replace(/\brestapis?\b/g, 'restapi')
        .replace(/ai\s*\/\s*ml/g, 'aiml')
        .replace(/[^a-z0-9]+/g, '')
        .trim();

const preprocessSkillText = (value = '') => {
    const normalized = normalizeSkillToken(value)
        .replace(/\b\.net\b/gi, 'dotnet')
        .replace(/\bci\s*\/\s*cd\b/gi, 'ci/cd');

    const hasPrimaryDelimiters = /[;,|]/.test(normalized);
    const dotCount = (normalized.match(/\./g) || []).length;
    const shouldSplitAllDots = !hasPrimaryDelimiters && dotCount >= 1 && !/^\d+\.\d+$/.test(normalized);

    if (shouldSplitAllDots) {
        return normalized.replace(/\./g, ',');
    }

    return normalized.replace(/\.\s+/g, ', ');
};

const splitDotDelimitedToken = (value = '') => {
    const token = normalizeSkillToken(value);
    if (!token) {
        return [];
    }

    const dotCount = (token.match(/\./g) || []).length;
    if (dotCount === 0) {
        return [token];
    }

    const lowerToken = token.toLowerCase();
    const isKnownSingleDotToken =
        dotCount === 1 &&
        (/\b[a-z0-9+#-]+\.(js|ts|net)\b/i.test(lowerToken) || lowerToken === 'dotnet' || /^\d+\.\d+$/.test(lowerToken));

    if (isKnownSingleDotToken) {
        return [token];
    }

    return token
        .split('.')
        .map((part) => normalizeSkillToken(part))
        .filter(Boolean);
};

const splitSkillTokens = (value = '') =>
    preprocessSkillText(value)
        .split(/[;,|]+/)
        .flatMap((token) => splitDotDelimitedToken(token))
        .map((token) => normalizeSkillToken(token))
        .filter(Boolean);

const normalizeHeadingKey = (value = '') =>
    normalizeSkillToken(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const toDisplayHeading = (value = '') =>
    normalizeSkillToken(value)
        .split(' ')
        .map((word) => {
            if (!word) {
                return '';
            }

            if (word.includes('/')) {
                return word
                    .split('/')
                    .map((segment) =>
                        segment.length <= 3
                            ? segment.toUpperCase()
                            : `${segment.charAt(0).toUpperCase()}${segment.slice(1).toLowerCase()}`,
                    )
                    .join('/');
            }

            return word.length <= 3 ? word.toUpperCase() : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
        })
        .join(' ')
        .trim();

const resolveCategoryFromDisplayHeading = (heading = '') => {
    const normalizedHeading = toDisplayHeading(heading).toLowerCase();
    if (!normalizedHeading) {
        return null;
    }

    const match = Object.entries(SKILL_CATEGORY_LABELS).find(([, label]) => label.toLowerCase() === normalizedHeading);
    return match?.[0] || null;
};

const resolveCategoryFromHeading = (heading = '') => {
    const normalizedHeading = normalizeSkillToken(heading).toLowerCase();
    if (!normalizedHeading) {
        return null;
    }

    const matchedEntry = Object.entries(SKILL_CATEGORY_ALIASES).find(([, aliases]) =>
        aliases.some((alias) => {
            const normalizedAlias = alias.toLowerCase();
            if (normalizedAlias.length <= 3) {
                const aliasRegex = new RegExp(`\\b${normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                return aliasRegex.test(normalizedHeading);
            }

            return normalizedHeading.includes(normalizedAlias);
        }),
    );

    return matchedEntry?.[0] || null;
};

const hasAnyKeywordMatch = (text = '', keywords = []) =>
    keywords.some((keyword) => text.includes(keyword));

const buildSkillContext = (entries = []) => {
    const joined = entries.map((entry) => normalizeSkillToken(entry).toLowerCase()).join(' ');

    return {
        hasAiSignals: hasAnyKeywordMatch(joined, AI_CONTEXT_KEYWORDS),
        hasDataScienceSignals: hasAnyKeywordMatch(joined, DATA_SCIENCE_CONTEXT_KEYWORDS),
        hasDataAnalyticsSignals: hasAnyKeywordMatch(joined, DATA_ANALYTICS_CONTEXT_KEYWORDS),
        hasBackendSignals: hasAnyKeywordMatch(joined, BACKEND_CONTEXT_KEYWORDS),
    };
};

const scoreCategoryMatch = (skill = '', keywords = []) =>
    keywords.reduce((score, keyword) => (skill.includes(keyword) ? score + 1 : score), 0);

const resolveCategoryFromSkill = (skill = '', context = {}) => {
    const normalizedSkill = normalizeSkillToken(skill).toLowerCase();
    if (!normalizedSkill) {
        return 'other';
    }

    if (normalizedSkill === 'python' || normalizedSkill.startsWith('python ')) {
        if (context.hasAiSignals) {
            return 'ai_ml';
        }

        if (context.hasDataScienceSignals) {
            return 'data_science';
        }

        if (context.hasDataAnalyticsSignals) {
            return 'data_analytics';
        }

        if (context.hasBackendSignals) {
            return 'backend';
        }

        return 'languages';
    }

    if (normalizedSkill === 'sql' || normalizedSkill.startsWith('sql ')) {
        if (context.hasDataAnalyticsSignals) {
            return 'data_analytics';
        }

        return context.hasDataScienceSignals ? 'data_science' : 'databases';
    }

    const canonicalSkill = toCanonicalSkillKey(normalizedSkill);
    if (canonicalSkill === 'artificialintelligence' || canonicalSkill === 'machinelearning') {
        return 'ai_ml';
    }

    if (['fullstack', 'fullstackdevelopment', 'mern', 'mean', 'mevn', 'pern', 'lamp'].includes(canonicalSkill)) {
        return 'full_stack';
    }

    if (canonicalSkill === 'dataanalyst' || canonicalSkill === 'businessintelligence') {
        return 'data_analytics';
    }

    if (canonicalSkill === 'restapi' || canonicalSkill === 'restapis') {
        return 'backend';
    }

    let bestKey = 'other';
    let bestScore = 0;

    SKILL_CATEGORY_ORDER.filter((category) => category !== 'other').forEach((category) => {
        const score = scoreCategoryMatch(normalizedSkill, SKILL_KEYWORDS[category] || []);
        if (score > bestScore) {
            bestScore = score;
            bestKey = category;
        }
    });

    if (bestScore > 0) {
        return bestKey;
    }

    return 'other';
};

export const toSkillDisplayLines = (skills = [], maxLines = 14) => {
    const entries = normalizeSkillEntries(skills);
    if (!entries.length) {
        return [];
    }

    const context = buildSkillContext(entries);
    const groups = new Map();
    const seenByGroup = new Map();
    const seenGlobally = new Set();
    const groupInsertionOrder = [];
    const ensureGroup = (groupKey, headingLabel) => {
        if (!groups.has(groupKey)) {
            groups.set(groupKey, { heading: headingLabel, items: [] });
            seenByGroup.set(groupKey, new Set());
            groupInsertionOrder.push(groupKey);
        }
    };

    const addSkill = (groupKey, skillText, customHeading = '') => {
        const knownCategory = SKILL_CATEGORY_ORDER.includes(groupKey);
        const resolvedGroupKey = knownCategory
            ? groupKey
            : String(groupKey || '').startsWith('custom:')
                ? groupKey
                : 'other';
        const headingLabel = knownCategory
            ? SKILL_CATEGORY_LABELS[resolvedGroupKey]
            : clean(customHeading) || 'Specialization';
        const normalizedSkill = normalizeSkillToken(skillText);

        if (!normalizedSkill) {
            return;
        }

        ensureGroup(resolvedGroupKey, headingLabel);
        const dedupeKey = toCanonicalSkillKey(normalizedSkill) || normalizedSkill.toLowerCase();
        if (seenGlobally.has(dedupeKey)) {
            return;
        }

        if (seenByGroup.get(resolvedGroupKey).has(dedupeKey)) {
            return;
        }

        seenGlobally.add(dedupeKey);
        seenByGroup.get(resolvedGroupKey).add(dedupeKey);
        groups.get(resolvedGroupKey).items.push(normalizedSkill);
    };

    const chooseTargetGroup = (activeGroupKey, token) => {
        const isCustomGroup = String(activeGroupKey || '').startsWith('custom:');
        if (isCustomGroup) {
            return activeGroupKey;
        }

        if (!SKILL_CATEGORY_ORDER.includes(activeGroupKey)) {
            return resolveCategoryFromSkill(token, context);
        }

        const inferredCategory = resolveCategoryFromSkill(token, context);
        if (inferredCategory !== 'other' && inferredCategory !== activeGroupKey) {
            return inferredCategory;
        }

        return activeGroupKey;
    };

    normalizeStringList(skills).forEach((skillItem) => {
        const lines = normalizeMultiline(skillItem)
            .split('\n')
            .map((line) => clean(line))
            .filter(Boolean);

        let itemActiveGroupKey = null;
        let itemActiveGroupHeading = '';

        lines.forEach((line, lineIndex) => {
            const separatorIndex = line.indexOf(':');

            if (separatorIndex > 0) {
                const heading = normalizeSkillToken(line.slice(0, separatorIndex));
                const inlineValue = clean(line.slice(separatorIndex + 1));
                const headingCategory = resolveCategoryFromHeading(heading) || resolveCategoryFromDisplayHeading(heading);

                if (headingCategory) {
                    itemActiveGroupKey = headingCategory;
                    itemActiveGroupHeading = SKILL_CATEGORY_LABELS[headingCategory];
                } else {
                    const customKey = normalizeHeadingKey(heading) || 'other-skills';
                    itemActiveGroupKey = `custom:${customKey}`;
                    itemActiveGroupHeading = toDisplayHeading(heading) || 'Specialization';
                }

                splitSkillTokens(inlineValue).forEach((token) => {
                    const targetGroup = chooseTargetGroup(itemActiveGroupKey, token);
                    const targetHeading = String(targetGroup).startsWith('custom:')
                        ? itemActiveGroupHeading
                        : SKILL_CATEGORY_LABELS[targetGroup] || itemActiveGroupHeading;

                    addSkill(targetGroup, token, targetHeading);
                });
                return;
            }

            splitSkillTokens(line).forEach((token) => {
                if (lineIndex > 0 && itemActiveGroupKey) {
                    const targetGroup = chooseTargetGroup(itemActiveGroupKey, token);
                    const targetHeading = String(targetGroup).startsWith('custom:')
                        ? itemActiveGroupHeading
                        : SKILL_CATEGORY_LABELS[targetGroup] || itemActiveGroupHeading;

                    addSkill(targetGroup, token, targetHeading);
                    return;
                }

                const category = resolveCategoryFromSkill(token, context);
                addSkill(category, token, itemActiveGroupHeading);
            });
        });
    });

    const orderedGroups = [
        ...SKILL_CATEGORY_ORDER.filter((groupKey) => groups.has(groupKey)),
        ...groupInsertionOrder.filter((groupKey) => !SKILL_CATEGORY_ORDER.includes(groupKey)),
    ];

    return orderedGroups
        .map((groupKey) => ({
            heading: groups.get(groupKey).heading,
            text: groups.get(groupKey).items.join(', ').trim(),
        }))
        .filter((line) => Boolean(line.text))
        .slice(0, maxLines);
};

export const toSkillInlineText = (skills = [], separator = ', ', maxLines = 10) =>
    toSkillDisplayLines(skills, maxLines)
        .map((line) => (line.heading ? `${line.heading}: ${line.text}` : line.text))
        .filter(Boolean)
        .join(separator);

export const formatEducationDegreeYear = (educationItem = {}) => {
    const degree = clean(educationItem.degree);
    const yearRange = formatDateRange(educationItem.startYear, educationItem.endYear);

    return joinNonEmpty([degree, yearRange ? `(${yearRange})` : ' '], ' ');
};

const resolveBulletMaxLines = (options = undefined) => {
    if (typeof options === 'number') {
        return clampBulletLineCount(options);
    }

    if (options && typeof options === 'object') {
        return clampBulletLineCount(options.maxLines);
    }

    return 3;
};

export const toBullets = (value, fallbackBullets = [], options = undefined) => {
    const text = normalizeMultiline(value);
    const bulletPrefix = /^[\u2022*-]\s*/;
    const maxBulletLines = resolveBulletMaxLines(options);

    if (!text) {
        return finalizeA4BulletLines([], fallbackBullets, maxBulletLines);
    }

    const explicitLines = text
        .split('\n')
        .map((line) => line.replace(bulletPrefix, '').trim())
        .filter(Boolean);

    if (explicitLines.length > 1) {
        return finalizeA4BulletLines(explicitLines, fallbackBullets, maxBulletLines);
    }

    if (explicitLines.length === 1 && bulletPrefix.test(text)) {
        return finalizeA4BulletLines(explicitLines, fallbackBullets, maxBulletLines);
    }

    const sentenceLines = text
        .split(/(?<=[.!?])\s+/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (sentenceLines.length) {
        const base = sentenceLines.slice(0, maxBulletLines);
        if (base.length === maxBulletLines) {
            return finalizeA4BulletLines(base, fallbackBullets, maxBulletLines);
        }

        const expanded = dedupeLines([
            ...base,
            ...text
                .split(/[,;]\s+/)
                .map((line) => cleanOneLine(line))
                .filter(Boolean),
        ]);

        return finalizeA4BulletLines(expanded, fallbackBullets, maxBulletLines);
    }

    return finalizeA4BulletLines([], fallbackBullets, maxBulletLines);
};
