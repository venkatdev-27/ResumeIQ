const { ATS_PRIORITY_KEYWORDS } = require('../constants/atsKeywords');
const { tokenize, removeStopWords, getWordFrequencyMap } = require('../utils/normalizeText');

const MAX_EXTRACTION_KEYWORDS = 120;
const MIN_EXTRACTION_KEYWORDS = 100;

const SOFT_SKILL_TERMS = new Set([
    'communication',
    'leadership',
    'teamwork',
    'collaboration',
    'problem solving',
    'critical thinking',
    'time management',
    'stakeholder management',
    'project management',
]);

const NOISE_TERMS = new Set([
    'resume',
    'experience',
    'project',
    'projects',
    'work',
    'working',
    'role',
    'roles',
    'responsible',
    'responsibilities',
    'developer',
    'development',
    'engineer',
    'engineering',
    'team',
    'teams',
    'application',
    'applications',
    'system',
    'systems',
    'solution',
    'solutions',
    'implementation',
    'implemented',
    'build',
    'built',
    'using',
    'used',
]);

const PLURAL_EXCEPTIONS = new Set([
    'aws',
    'css',
    'kubernetes',
    'devops',
    'analysis',
    'redis',
    'typescript',
    'javascript',
    'microservices',
    'expressjs',
    'reactjs',
    'nextjs',
    'nodejs',
    'mongodb',
]);

const KEYWORD_CATALOG_BY_CATEGORY = {
    languages: [
        'javascript',
        'typescript',
        'python',
        'java',
        'golang',
        'go',
        'csharp',
        'cpp',
        'php',
        'ruby',
        'rust',
        'kotlin',
        'swift',
        'sql',
    ],
    frameworks: [
        'reactjs',
        'nextjs',
        'nodejs',
        'expressjs',
        'nestjs',
        'vuejs',
        'angular',
        'svelte',
        'redux',
        'tailwindcss',
        'bootstrap',
        'graphql',
        'rest api',
        'socket io',
    ],
    databases: [
        'mongodb',
        'postgresql',
        'mysql',
        'redis',
        'elasticsearch',
        'dynamodb',
        'sqlite',
        'cassandra',
        'oracle',
        'firebase',
    ],
    tools: [
        'git',
        'github',
        'github actions',
        'gitlab ci',
        'bitbucket',
        'postman',
        'swagger',
        'jira',
        'linux',
        'bash',
        'powershell',
        'npm',
        'pnpm',
        'yarn',
    ],
    cloud: [
        'aws',
        'azure',
        'gcp',
        'lambda',
        'ec2',
        's3',
        'cloudfront',
        'api gateway',
        'cloudwatch',
        'serverless',
    ],
    testing: [
        'unit testing',
        'integration testing',
        'e2e testing',
        'test automation',
        'jest',
        'mocha',
        'chai',
        'cypress',
        'playwright',
        'selenium',
    ],
    architecture: [
        'microservices',
        'event driven architecture',
        'clean architecture',
        'scalable architecture',
        'system design',
        'design patterns',
        'api design',
        'authentication',
        'authorization',
        'jwt',
        'oauth2',
        'encryption',
        'owasp',
        'message queue',
        'rabbitmq',
        'kafka',
        'performance optimization',
        'scalability',
        'security',
    ],
    methodologies: [
        'agile',
        'scrum',
        'kanban',
        'tdd',
        'bdd',
        'ci cd',
        'devops',
        'automation',
    ],
    ai_ml: [
        'artificial intelligence',
        'machine learning',
        'deep learning',
        'natural language processing',
        'computer vision',
        'llm',
        'rag',
        'prompt engineering',
        'tensorflow',
        'pytorch',
        'hugging face',
        'langchain',
    ],
    soft_skills: [...SOFT_SKILL_TERMS],
};

const KEYWORD_TO_CATEGORY = new Map();
const CATALOG_TERMS = [];

Object.entries(KEYWORD_CATALOG_BY_CATEGORY).forEach(([category, terms]) => {
    (terms || []).forEach((term) => {
        const normalizedTerm = String(term || '').trim().toLowerCase();
        if (!normalizedTerm) {
            return;
        }
        CATALOG_TERMS.push(normalizedTerm);
        if (!KEYWORD_TO_CATEGORY.has(normalizedTerm)) {
            KEYWORD_TO_CATEGORY.set(normalizedTerm, category);
        }
    });
});

ATS_PRIORITY_KEYWORDS.forEach((term) => {
    const normalizedTerm = String(term || '').trim().toLowerCase();
    if (!normalizedTerm) {
        return;
    }
    if (!KEYWORD_TO_CATEGORY.has(normalizedTerm)) {
        KEYWORD_TO_CATEGORY.set(normalizedTerm, SOFT_SKILL_TERMS.has(normalizedTerm) ? 'soft_skills' : 'frameworks');
    }
});

const NORMALIZATION_MAP = new Map([
    ['ai', 'artificial intelligence'],
    ['ml', 'machine learning'],
    ['dl', 'deep learning'],
    ['nlp', 'natural language processing'],
    ['react', 'reactjs'],
    ['react js', 'reactjs'],
    ['reactjs', 'reactjs'],
    ['next', 'nextjs'],
    ['next js', 'nextjs'],
    ['nextjs', 'nextjs'],
    ['node', 'nodejs'],
    ['node js', 'nodejs'],
    ['nodejs', 'nodejs'],
    ['express', 'expressjs'],
    ['express js', 'expressjs'],
    ['expressjs', 'expressjs'],
    ['mongo', 'mongodb'],
    ['mongo db', 'mongodb'],
    ['mongodb', 'mongodb'],
    ['js', 'javascript'],
    ['ts', 'typescript'],
    ['typescripts', 'typescript'],
    ['javascripts', 'javascript'],
    ['restful api', 'rest api'],
    ['rest apis', 'rest api'],
    ['restful apis', 'rest api'],
    ['restapi', 'rest api'],
    ['microservice', 'microservices'],
    ['k8s', 'kubernetes'],
    ['postgre sql', 'postgresql'],
    ['postgres', 'postgresql'],
    ['ci cd', 'ci cd'],
    ['cicd', 'ci cd'],
    ['ci c d', 'ci cd'],
    ['unit tests', 'unit testing'],
    ['integration tests', 'integration testing'],
    ['e2e tests', 'e2e testing'],
    ['test automation', 'test automation'],
    ['amazon web services', 'aws'],
    ['google cloud platform', 'gcp'],
    ['microsoft azure', 'azure'],
    ['tailwind', 'tailwindcss'],
]);

const MATCH_VARIANTS_MAP = new Map([
    ['artificial intelligence', ['artificial intelligence', 'ai']],
    ['machine learning', ['machine learning', 'ml']],
    ['deep learning', ['deep learning', 'dl']],
    ['natural language processing', ['natural language processing', 'nlp']],
    ['reactjs', ['reactjs', 'react js', 'react']],
    ['nextjs', ['nextjs', 'next js', 'next']],
    ['nodejs', ['nodejs', 'node js', 'node']],
    ['expressjs', ['expressjs', 'express js', 'express']],
    ['mongodb', ['mongodb', 'mongo db', 'mongo']],
    ['javascript', ['javascript', 'java script', 'js']],
    ['typescript', ['typescript', 'type script', 'ts']],
    ['rest api', ['rest api', 'restful api', 'rest apis', 'restful apis', 'restapi']],
    ['ci cd', ['ci cd', 'ci/cd', 'cicd']],
    ['kubernetes', ['kubernetes', 'k8s']],
    ['postgresql', ['postgresql', 'postgres', 'postgre sql']],
]);

const escapeRegExp = (value = '') => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const singularizeToken = (token = '') => {
    if (!token) {
        return '';
    }

    if (PLURAL_EXCEPTIONS.has(token)) {
        return token;
    }

    if (token.endsWith('ies') && token.length > 4) {
        return `${token.slice(0, -3)}y`;
    }

    if (token.endsWith('ses') && token.length > 4) {
        return token.slice(0, -2);
    }

    if (token.endsWith('s') && token.length > 3 && !token.endsWith('ss')) {
        return token.slice(0, -1);
    }

    return token;
};

const normalizeTokenPhrase = (value = '') =>
    String(value || '')
        .toLowerCase()
        .replace(/\bc\+\+\b/g, ' cpp ')
        .replace(/\bc#\b/g, ' csharp ')
        .replace(/[._/\\-]+/g, ' ')
        .replace(/[^a-z0-9+\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeKeywordTerm = (value = '') => {
    const normalizedPhrase = normalizeTokenPhrase(value);
    if (!normalizedPhrase) {
        return '';
    }

    const singularized = normalizedPhrase
        .split(' ')
        .map((token) => singularizeToken(token))
        .filter(Boolean)
        .join(' ')
        .trim();

    if (!singularized) {
        return '';
    }

    const compact = singularized.replace(/\s+/g, '');

    if (NORMALIZATION_MAP.has(singularized)) {
        return NORMALIZATION_MAP.get(singularized);
    }

    if (NORMALIZATION_MAP.has(compact)) {
        return NORMALIZATION_MAP.get(compact);
    }

    return singularized;
};

const NORMALIZED_PRIORITY_TERMS = [...new Set(
    ATS_PRIORITY_KEYWORDS
        .map((term) => normalizeKeywordTerm(term))
        .filter(Boolean),
)];

const NORMALIZED_CATALOG_TERMS = [...new Set(
    CATALOG_TERMS
        .map((term) => normalizeKeywordTerm(term))
        .filter(Boolean),
)];
const NORMALIZED_PRIORITY_TERM_SET = new Set(NORMALIZED_PRIORITY_TERMS);
const NORMALIZED_CATALOG_TERM_SET = new Set(NORMALIZED_CATALOG_TERMS);

const CATALOG_TOKEN_SET = new Set(
    NORMALIZED_CATALOG_TERMS.flatMap((term) => term.split(' ').filter(Boolean)),
);
const PRIORITY_TOKEN_SET = new Set(
    NORMALIZED_PRIORITY_TERMS.flatMap((term) => term.split(' ').filter(Boolean)),
);

const dedupeNormalizedKeywords = (value = [], max = MAX_EXTRACTION_KEYWORDS) => {
    const seen = new Set();
    const result = [];

    for (const item of Array.isArray(value) ? value : []) {
        const normalized = normalizeKeywordTerm(item);
        if (!normalized) {
            continue;
        }
        if (seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        result.push(normalized);
        if (result.length >= max) {
            break;
        }
    }

    return result;
};

const normalizeSkillArray = (skills = [], max = 60) =>
    dedupeNormalizedKeywords(
        (Array.isArray(skills) ? skills : [])
            .flatMap((item) => String(item || '').split(','))
            .map((item) => item.trim())
            .filter(Boolean),
        max,
    );

const parseUserSkillsInput = (userSkills = '', max = 60) => {
    const source = Array.isArray(userSkills) ? userSkills.join(',') : String(userSkills || '');
    const rawSkills = source
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    return {
        rawSkills,
        normalizedSkills: dedupeNormalizedKeywords(rawSkills, max),
    };
};

const isSoftSkillKeyword = (keyword = '') => {
    const normalized = normalizeKeywordTerm(keyword);
    return Boolean(normalized) && SOFT_SKILL_TERMS.has(normalized);
};

const isTechnicalKeyword = (keyword = '') => {
    const normalized = normalizeKeywordTerm(keyword);
    if (!normalized) {
        return false;
    }

    if (SOFT_SKILL_TERMS.has(normalized)) {
        return false;
    }

    const category = KEYWORD_TO_CATEGORY.get(normalized);
    if (!category) {
        return true;
    }

    return category !== 'soft_skills';
};

const getKeywordCategory = (keyword = '') => {
    const normalized = normalizeKeywordTerm(keyword);
    if (!normalized) {
        return 'unknown';
    }
    return KEYWORD_TO_CATEGORY.get(normalized) || 'unknown';
};

const buildSearchText = (text = '') =>
    ` ${String(text || '')
        .toLowerCase()
        .replace(/[._/\\-]+/g, ' ')
        .replace(/[^a-z0-9+\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()} `;

const getKeywordMatchVariants = (keyword = '') => {
    const normalizedKeyword = normalizeKeywordTerm(keyword);
    if (!normalizedKeyword) {
        return [];
    }

    const rawVariants = MATCH_VARIANTS_MAP.get(normalizedKeyword) || [normalizedKeyword];
    const normalizedVariants = new Set(
        rawVariants
            .map((variant) => normalizeTokenPhrase(variant))
            .filter(Boolean),
    );

    normalizedVariants.add(normalizedKeyword);

    return [...normalizedVariants];
};

const countKeywordOccurrences = (searchText = '', keyword = '') => {
    const variants = getKeywordMatchVariants(keyword);
    if (!variants.length) {
        return 0;
    }

    let totalMatches = 0;
    variants.forEach((variant) => {
        const escaped = escapeRegExp(variant);
        const regex = variant.includes(' ')
            ? new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, 'g')
            : new RegExp(`\\b${escaped}s?\\b`, 'g');
        const matches = String(searchText || '').match(regex) || [];
        totalMatches += matches.length;
    });

    return totalMatches;
};

const buildNGrams = (tokens = [], maxGram = 3) => {
    const grams = [];
    for (let size = 1; size <= maxGram; size += 1) {
        for (let i = 0; i <= tokens.length - size; i += 1) {
            grams.push(tokens.slice(i, i + size).join(' '));
        }
    }
    return grams;
};

const shouldKeepFrequencyTerm = (term = '', count = 0) => {
    if (!term) {
        return false;
    }

    const normalized = normalizeKeywordTerm(term);
    if (!normalized) {
        return false;
    }

    if (NOISE_TERMS.has(normalized)) {
        return false;
    }

    if (normalized.length <= 2) {
        return false;
    }

    if (/^\d+$/.test(normalized)) {
        return false;
    }

    const wordCount = normalized.split(' ').length;

    const isKnownKeyword = NORMALIZED_CATALOG_TERM_SET.has(normalized) || NORMALIZED_PRIORITY_TERM_SET.has(normalized);
    if (!isKnownKeyword) {
        return false;
    }

    const tokens = normalized.split(' ').filter(Boolean);
    const hasUncatalogedNoiseToken = tokens.some(
        (token) => !CATALOG_TOKEN_SET.has(token) && !PRIORITY_TOKEN_SET.has(token),
    );
    if (hasUncatalogedNoiseToken) {
        return false;
    }

    if (wordCount === 1) {
        return count >= 2;
    }

    return count >= 1;
};

const upsertCandidate = (store, { rawTerm, normalizedTerm, category, count, score }) => {
    if (!normalizedTerm) {
        return;
    }

    const existing = store.get(normalizedTerm);
    if (existing) {
        existing.count += count;
        existing.score += score;
        if (!existing.term && rawTerm) {
            existing.term = rawTerm;
        }
        return;
    }

    store.set(normalizedTerm, {
        term: rawTerm || normalizedTerm,
        normalized: normalizedTerm,
        category: category || getKeywordCategory(normalizedTerm),
        count,
        score,
    });
};

const extractKeywordsFromText = (text = '', options = {}) => {
    const {
        maxKeywords = MAX_EXTRACTION_KEYWORDS,
        includeSoftSkills = false,
        strictCatalog = false,
    } = options;
    const searchText = buildSearchText(text);

    if (!searchText.trim()) {
        return [];
    }

    const keywordStore = new Map();

    NORMALIZED_CATALOG_TERMS.forEach((catalogTerm) => {
        const normalizedCatalogTerm = normalizeKeywordTerm(catalogTerm);
        if (!includeSoftSkills && isSoftSkillKeyword(normalizedCatalogTerm)) {
            return;
        }

        const count = countKeywordOccurrences(searchText, normalizedCatalogTerm);
        if (!count) {
            return;
        }

        const priorityBoost = ATS_PRIORITY_KEYWORDS.some((priority) => normalizeKeywordTerm(priority) === normalizedCatalogTerm)
            ? 2.5
            : 1.8;

        upsertCandidate(keywordStore, {
            rawTerm: normalizedCatalogTerm,
            normalizedTerm: normalizedCatalogTerm,
            category: getKeywordCategory(normalizedCatalogTerm),
            count,
            score: count * priorityBoost,
        });
    });

    NORMALIZED_PRIORITY_TERMS.forEach((priorityTerm) => {
        if (!includeSoftSkills && isSoftSkillKeyword(priorityTerm)) {
            return;
        }

        const count = countKeywordOccurrences(searchText, priorityTerm);
        if (!count) {
            return;
        }

        upsertCandidate(keywordStore, {
            rawTerm: priorityTerm,
            normalizedTerm: priorityTerm,
            category: getKeywordCategory(priorityTerm),
            count,
            score: count * 2.7,
        });
    });

    if (strictCatalog) {
        const strictRanked = [...keywordStore.values()]
            .filter((item) => Boolean(item?.normalized))
            .sort((a, b) => b.score - a.score || b.count - a.count || a.normalized.localeCompare(b.normalized))
            .slice(0, maxKeywords);
        return strictRanked;
    }

    const normalizedTokens = removeStopWords(tokenize(searchText));
    const ngramFrequencyMap = getWordFrequencyMap(buildNGrams(normalizedTokens, 3));

    for (const [term, count] of ngramFrequencyMap.entries()) {
        if (!shouldKeepFrequencyTerm(term, count)) {
            continue;
        }

        const normalizedTerm = normalizeKeywordTerm(term);
        if (!normalizedTerm) {
            continue;
        }

        if (!includeSoftSkills && isSoftSkillKeyword(normalizedTerm)) {
            continue;
        }

        const wordCount = normalizedTerm.split(' ').length;
        const score = count * (wordCount === 1 ? 1.1 : wordCount === 2 ? 1.45 : 1.75);

        upsertCandidate(keywordStore, {
            rawTerm: term,
            normalizedTerm,
            category: getKeywordCategory(normalizedTerm),
            count,
            score,
        });
    }

    const ranked = [...keywordStore.values()]
        .filter((item) => Boolean(item?.normalized))
        .sort((a, b) => b.score - a.score || b.count - a.count || a.normalized.localeCompare(b.normalized))
        .slice(0, Math.max(maxKeywords, MIN_EXTRACTION_KEYWORDS));

    return ranked.slice(0, maxKeywords);
};

module.exports = {
    MAX_EXTRACTION_KEYWORDS,
    MIN_EXTRACTION_KEYWORDS,
    SOFT_SKILL_TERMS,
    normalizeKeywordTerm,
    normalizeSkillArray,
    dedupeNormalizedKeywords,
    parseUserSkillsInput,
    isSoftSkillKeyword,
    isTechnicalKeyword,
    getKeywordCategory,
    buildSearchText,
    countKeywordOccurrences,
    extractKeywordsFromText,
};
