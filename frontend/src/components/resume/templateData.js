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

const truncateSummary = (text, maxLines = 4, maxCharsPerLine = 170) => {
    if (!text) return '';

    const normalizedText = normalizeMultiline(text);
    const explicitLines = normalizedText
        .split('\n')
        .map((line) => cleanOneLine(line))
        .filter(Boolean);

    const sentenceLines = normalizedText
        .replace(/\n/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map((line) => cleanOneLine(line))
        .filter(Boolean);

    const clauseLines = normalizedText
        .replace(/\n/g, ' ')
        .split(/[,;]\s+/)
        .map((line) => cleanOneLine(line))
        .filter(Boolean);

    const merged = [];
    const pushUnique = (line) => {
        const value = cleanOneLine(line);
        if (!value) {
            return;
        }
        if (!merged.some((item) => item.toLowerCase() === value.toLowerCase())) {
            merged.push(value);
        }
    };

    explicitLines.forEach(pushUnique);
    sentenceLines.forEach(pushUnique);
    clauseLines.forEach(pushUnique);

    if (!merged.length) {
        return '';
    }

    const finalLines = merged
        .map((line) => {
            const trimmed = line.slice(0, maxCharsPerLine).trim();
            if (!trimmed) {
                return '';
            }
            return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
        })
        .filter(Boolean);

    const fixedLines = [...finalLines];
    const seedLines = [...finalLines];
    let cursor = 0;
    while (fixedLines.length < maxLines && seedLines.length) {
        fixedLines.push(seedLines[cursor % seedLines.length]);
        cursor += 1;
    }

    return fixedLines.slice(0, maxLines).join('\n');
};

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

const ensureThreeBulletLines = (lines = [], fallback = []) => {
    const base = dedupeLines(lines);
    const fallbackLines = dedupeLines(fallback);
    const merged = dedupeLines([...base, ...fallbackLines]);

    if (!merged.length) {
        return [];
    }

    const fixed = [...merged];
    const seed = [...merged];
    let cursor = 0;
    while (fixed.length < 3 && seed.length) {
        fixed.push(seed[cursor % seed.length]);
        cursor += 1;
    }

    return fixed.slice(0, 3);
};

export const joinNonEmpty = (values = [], separator = ' | ') =>
    (Array.isArray(values) ? values : [])
        .map((item) => clean(item))
        .filter(Boolean)
        .join(separator);

export const formatDateRange = (startDate, endDate, separator = ' - ') =>
    joinNonEmpty([startDate, endDate], separator);

const normalizePersonalDetails = (value = {}) => ({
    fullName: clean(value.fullName),
    title: clean(value.title),
    email: clean(value.email),
    phone: clean(value.phone),
    location: clean(value.location),
    summary: truncateSummary(normalizeMultiline(value.summary), 4, 400),
    linkedin: clean(value.linkedin),
    website: clean(value.website),
    photo: clean(value.photo),
});

const normalizeWorkExperience = (value = []) =>
    (Array.isArray(value) ? value : [])
        .map((item = {}) => ({
            company: clean(item.company),
            role: clean(item.role),
            startDate: clean(item.startDate),
            endDate: clean(item.endDate),
            description: normalizeMultiline(item.description),
        }))
        .filter((item) => hasAnyValue(item, ['company', 'role', 'startDate', 'endDate', 'description']))
        .slice(0, 3);

const normalizeProjects = (value = []) =>
    (Array.isArray(value) ? value : [])
        .map((item = {}) => ({
            name: clean(item.name),
            techStack: clean(item.techStack),
            link: clean(item.link),
            description: normalizeMultiline(item.description),
        }))
        .filter((item) => hasAnyValue(item, ['name', 'techStack', 'link', 'description']));

const normalizeInternships = (value = []) =>
    (Array.isArray(value) ? value : [])
        .map((item = {}) => ({
            company: clean(item.company),
            role: clean(item.role),
            startDate: clean(item.startDate),
            endDate: clean(item.endDate),
            description: normalizeMultiline(item.description),
        }))
        .filter((item) => hasAnyValue(item, ['company', 'role', 'startDate', 'endDate', 'description']));

const mergeExperienceWithInternships = (workExperience = [], internships = []) => [
    ...workExperience,
    ...internships.map((item) => ({
        ...item,
        role: clean(item.role),
    })),
];

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

export const getTemplateData = (resumeData = {}) => {
    const workExperience = normalizeWorkExperience(resumeData.workExperience || []);
    const internships = normalizeInternships(resumeData.internships || []);

    return {
        personalDetails: normalizePersonalDetails(resumeData.personalDetails || {}),
        workExperience: mergeExperienceWithInternships(workExperience, internships),
        projects: normalizeProjects(resumeData.projects || []),
        internships,
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
            'next',
            'next.js',
            'vue',
            'angular',
            'svelte',
            'html',
            'css',
            'sass',
            'tailwind',
            'bootstrap',
            'redux',
            'vite',
            'webpack',
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
            'express',
            'nestjs',
            'django',
            'flask',
            'spring',
            'laravel',
            'rails',
            '.net',
            'rest',
            'graphql',
            'api',
            'jwt',
            'microservice',
            'microservices',
        ],
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
            'prompt engineering',
            'rag',
        ],
    },
    {
        key: 'data_science',
        label: 'Data Science',
        aliases: ['data science', 'datascience', 'data sceinece', 'data sciencee', 'data analytics', 'data analysis', 'analytics', 'data visualization', 'bi'],
        keywords: [
            'data science',
            'data analytics',
            'data analysis',
            'data visualization',
            'tableau',
            'power bi',
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
        label: 'DevOps',
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
        label: 'Other Skills',
        aliases: ['other', 'others'],
        keywords: [],
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

        if (context.hasBackendSignals) {
            return 'backend';
        }

        return 'languages';
    }

    if (normalizedSkill === 'sql' || normalizedSkill.startsWith('sql ')) {
        return context.hasDataScienceSignals ? 'data_science' : 'databases';
    }

    const canonicalSkill = toCanonicalSkillKey(normalizedSkill);
    if (canonicalSkill === 'artificialintelligence' || canonicalSkill === 'machinelearning') {
        return 'ai_ml';
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

export const toSkillDisplayLines = (skills = [], maxLines = 10) => {
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
            : clean(customHeading) || 'Other Skills';
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
                    itemActiveGroupHeading = toDisplayHeading(heading) || 'Other Skills';
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

    return orderedGroups.map((groupKey) => ({
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

export const toBullets = (value, fallbackBullets = []) => {
    const text = normalizeMultiline(value);
    const bulletPrefix = /^[\u2022*-]\s*/;

    if (!text) {
        return ensureThreeBulletLines([], fallbackBullets);
    }

    const explicitLines = text
        .split('\n')
        .map((line) => line.replace(bulletPrefix, '').trim())
        .filter(Boolean);

    if (explicitLines.length > 1) {
        return ensureThreeBulletLines(explicitLines, fallbackBullets);
    }

    if (explicitLines.length === 1 && bulletPrefix.test(text)) {
        return ensureThreeBulletLines(explicitLines, fallbackBullets);
    }

    const sentenceLines = text
        .split(/(?<=[.!?])\s+/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (sentenceLines.length) {
        const base = sentenceLines.slice(0, 3);
        if (base.length === 3) {
            return base;
        }

        const expanded = dedupeLines([
            ...base,
            ...text
                .split(/[,;]\s+/)
                .map((line) => cleanOneLine(line))
                .filter(Boolean),
        ]);

        return ensureThreeBulletLines(expanded, fallbackBullets);
    }

    return ensureThreeBulletLines([], fallbackBullets);
};
