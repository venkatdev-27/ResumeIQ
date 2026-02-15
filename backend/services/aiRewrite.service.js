const { AppError } = require('../utils/response');
const { requestChatCompletion } = require('./aiClient.service');

const MAX_AI_PAYLOAD_CHARS = 12_000;
const TARGET_SUMMARY_MIN_LINES = 4;
const TARGET_SUMMARY_MAX_LINES = 5;
const TARGET_SUMMARY_LINES = TARGET_SUMMARY_MAX_LINES;
const TARGET_SUMMARY_MIN_WORDS = 45;
const TARGET_SUMMARY_MAX_WORDS = 47;
const TARGET_SUMMARY_WORDS = 46;
const LIVE_PREVIEW_SUMMARY_MIN_WORDS = 45;
const LIVE_PREVIEW_SUMMARY_MAX_WORDS = 47;
const LIVE_PREVIEW_SUMMARY_TARGET_WORDS = 46;

const TARGET_BULLET_LINES = 3;
const TARGET_BULLET_MIN_WORDS = 7;
const TARGET_BULLET_MAX_WORDS = 9;
const TARGET_BULLET_WORDS = 8;
const TARGET_SHORT_LIST_ITEMS = 20;
const IMPROVEMENT_MODES = Object.freeze({
    FULL: 'full',
    ATS_ONLY: 'ats_only',
    SUMMARY_PREVIEW: 'summary_preview',
});
const ATS_TARGET_SECTION_KEYS = new Set(['summary', 'workExperience', 'projects', 'internships']);
const RESUME_TEXT_SECTION_MATCHERS = [
    { key: 'summary', pattern: /^(professional summary|summary|profile|objective)$/i },
    { key: 'workExperience', pattern: /^(work experience|professional experience|employment history|experience)$/i },
    { key: 'projects', pattern: /^(projects|project experience|academic projects|personal projects)$/i },
    { key: 'internships', pattern: /^(internships?|internship experience|training)$/i },
];
const RESUME_TEXT_NON_TARGET_HEADERS = [
    /^(education|academics?)$/i,
    /^(skills?|technical skills?)$/i,
    /^(certifications?)$/i,
    /^(achievements?)$/i,
    /^(hobbies?)$/i,
    /^(contact|personal details?)$/i,
];
const ACTION_VERBS = ['Delivered', 'Engineered', 'Implemented', 'Optimized', 'Architected', 'Streamlined', 'Automated', 'Integrated', 'Developed', 'Deployed', 'Enhanced', 'Built', 'Led'];
const SUMMARY_FALLBACK_TOKENS = [
    'execution',
    'reliability',
    'consistency',
    'delivery',
    'quality',
    'collaboration',
    'impact',
    'outcomes',
    'alignment',
    'ownership',
];
const DEFAULT_PROFESSIONAL_SUMMARY_LINES = [
    'Role drives dependable delivery with structured ownership and accountability.',
    'Builds practical solutions aligned with real business objectives.',
    'Executes experience and internship responsibilities with measurable consistency.',
    'Delivers project outcomes through focused implementation and collaboration.',
    'Maintains quality, clarity, and meaningful end-to-end execution.',
];
const BULLET_FALLBACK_TOKENS = [
    'using',
    'modern',
    'engineering',
    'patterns',
    'for',
    'scalable',
    'reliable',
    'delivery',
    'and',
    'maintainable',
    'outcomes',
];
const BULLET_ENDING_TOKENS = [
    'outcomes',
    'impact',
    'quality',
    'stability',
    'security',
    'scalability',
    'reliability',
    'efficiency',
    'resilience',
    'adoption',
    'readiness',
    'performance',
    'consistency',
    'maintainability',
    'excellence',
];
const BULLET_PROFESSIONAL_VOCABULARY = [
    'analysis', 'architecture', 'automation', 'availability', 'benchmarking', 'capability', 'clarity', 'collaboration',
    'compliance', 'consistency', 'coordination', 'coverage', 'debugging', 'delivery', 'deployment', 'design',
    'documentation', 'efficiency', 'enablement', 'encryption', 'enhancement', 'evaluation', 'execution',
    'experimentation', 'governance', 'hardening', 'implementation', 'improvement', 'innovation', 'integration',
    'maintainability', 'management', 'migration', 'modularity', 'monitoring', 'optimization', 'orchestration',
    'performance', 'planning', 'prioritization', 'quality', 'reliability', 'remediation', 'resilience',
    'responsiveness', 'scalability', 'security', 'simplification', 'standardization', 'stability', 'strategy',
    'sustainability', 'testing', 'traceability', 'transformation', 'troubleshooting', 'validation', 'visibility',
    'workflow', 'accuracy', 'adaptability', 'alignment', 'assessment', 'assurance', 'auditing', 'backlog',
    'baseline', 'calibration', 'capacity', 'checkpoint', 'cohesion', 'communication', 'configuration', 'connectivity',
    'consolidation', 'continuity', 'control', 'correctness', 'craftsmanship', 'credibility', 'diagnostics',
    'discipline', 'discoverability', 'durability', 'elasticity', 'escalation', 'estimation', 'evidence', 'excellence',
    'fault-tolerance', 'feasibility', 'fitment', 'forecasting', 'framework', 'goals', 'guardrails', 'handover',
    'hygiene', 'identity', 'incident', 'indexing', 'inspection', 'insight', 'instrumentation', 'integrity',
    'interoperability', 'iteration', 'latency', 'lifecycle', 'loadbalancing', 'maintainers', 'maintainership',
    'maturity', 'metrics', 'milestones', 'modernization', 'observability', 'onboarding', 'operability', 'ownership',
    'partitioning', 'patterns', 'pipelines', 'portability', 'pragmatism', 'precision', 'preparedness', 'prevention',
    'productivity', 'profiling', 'progress', 'protection', 'readability', 'readiness', 'recoverability', 'refactoring',
    'regression', 'release', 'repeatability', 'reporting', 'requirements', 'reviewability', 'roadmap', 'robustness',
    'safeguards', 'scheduling', 'scope', 'serviceability', 'service-levels', 'simplicity', 'skills', 'source-control',
    'stakeholders', 'standards', 'streamlining', 'structure', 'supportability', 'synchronization', 'telemetry',
    'throughput', 'timeliness', 'tooling', 'transparency', 'trust', 'uptime', 'usability', 'versioning', 'velocity',
    'verification', 'architecture-led', 'business-alignment', 'customer-impact', 'deployment-readiness', 'devops',
    'engineering', 'feature-delivery', 'incident-response', 'knowledge-sharing', 'platform-thinking', 'problem-solving',
    'release-confidence', 'risk-control', 'scalable-design', 'service-quality', 'solutioning', 'system-thinking',
    'technical-depth', 'value-delivery', 'quality-gates', 'integration-depth', 'code-health', 'operational-excellence',
    'production-readiness', 'continuous-improvement', 'testability', 'reusability', 'maintainer-focus', 'secure-by-design',
];

const truncateText = (value = '', max = 1200) => String(value || '').trim().slice(0, max);
const toSafeAiJson = (data, maxChars = MAX_AI_PAYLOAD_CHARS) => JSON.stringify(data ?? '').slice(0, maxChars);

const ensureArrayOfStrings = (value) =>
    Array.isArray(value)
        ? value
              .map((item) => String(item || '').trim())
              .filter(Boolean)
              .slice(0, 200)
        : [];

const ensureObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const normalizeImprovementMode = (value = '') => {
    const mode = String(value || '').trim().toLowerCase();
    if (mode === IMPROVEMENT_MODES.ATS_ONLY) {
        return IMPROVEMENT_MODES.ATS_ONLY;
    }
    if (mode === IMPROVEMENT_MODES.SUMMARY_PREVIEW) {
        return IMPROVEMENT_MODES.SUMMARY_PREVIEW;
    }
    return IMPROVEMENT_MODES.FULL;
};
const isAtsOnlyMode = (value = '') => normalizeImprovementMode(value) === IMPROVEMENT_MODES.ATS_ONLY;
const isSummaryPreviewMode = (value = '') => normalizeImprovementMode(value) === IMPROVEMENT_MODES.SUMMARY_PREVIEW;

const hasAnyText = (...values) => values.some((value) => Boolean(String(value || '').trim()));

const ATS_SKILL_NORMALIZATION_MAP = new Map([
    ['react', 'ReactJS'],
    ['reactjs', 'ReactJS'],
    ['react js', 'ReactJS'],
    ['node', 'NodeJS'],
    ['nodejs', 'NodeJS'],
    ['node js', 'NodeJS'],
    ['express', 'ExpressJS'],
    ['expressjs', 'ExpressJS'],
    ['express js', 'ExpressJS'],
    ['mongo', 'MongoDB'],
    ['mongodb', 'MongoDB'],
    ['mongo db', 'MongoDB'],
    ['js', 'JavaScript'],
    ['javascript', 'JavaScript'],
    ['java script', 'JavaScript'],
    ['ts', 'TypeScript'],
    ['typescript', 'TypeScript'],
    ['aws', 'AWS'],
    ['azure', 'Azure'],
    ['gcp', 'GCP'],
    ['sql', 'SQL'],
    ['html', 'HTML'],
    ['css', 'CSS'],
]);

const normalizeSkillKey = (value = '') =>
    compactToOneLine(value)
        .toLowerCase()
        .replace(/[._/\\-]+/g, ' ')
        .replace(/[^a-z0-9+\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const SKILL_MATCH_VARIANTS = new Map([
    ['reactjs', ['reactjs', 'react js', 'react']],
    ['nodejs', ['nodejs', 'node js', 'node']],
    ['expressjs', ['expressjs', 'express js', 'express']],
    ['mongodb', ['mongodb', 'mongo db', 'mongo']],
    ['javascript', ['javascript', 'java script', 'js']],
    ['typescript', ['typescript', 'type script', 'ts']],
    ['artificial intelligence', ['artificial intelligence', 'ai']],
    ['machine learning', ['machine learning', 'ml']],
    ['deep learning', ['deep learning', 'dl']],
    ['natural language processing', ['natural language processing', 'nlp']],
]);

const splitSkillCandidates = (value = '') =>
    String(value || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split(/[,;\n|]+/g)
        .map((item) => item.trim())
        .filter(Boolean);

const toSkillSourceArray = (source) => {
    if (Array.isArray(source)) {
        return source;
    }
    if (typeof source === 'string') {
        return [source];
    }
    return [];
};

const toSkillMatchKey = (value = '') =>
    normalizeSkillKey(value).replace(/\s+/g, '');

const toTitleCase = (value = '') =>
    compactToOneLine(value)
        .split(' ')
        .map((token) => {
            if (!token) {
                return '';
            }
            if (/^[A-Z0-9]+$/.test(token)) {
                return token;
            }
            return `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`;
        })
        .join(' ')
        .trim();

const normalizeAtsSkillName = (value = '') => {
    const normalized = normalizeSkillKey(value);
    if (!normalized) {
        return '';
    }

    const compact = normalized.replace(/\s+/g, '');
    if (ATS_SKILL_NORMALIZATION_MAP.has(normalized)) {
        return ATS_SKILL_NORMALIZATION_MAP.get(normalized);
    }

    if (ATS_SKILL_NORMALIZATION_MAP.has(compact)) {
        return ATS_SKILL_NORMALIZATION_MAP.get(compact);
    }

    if (normalized.includes(':')) {
        return compactToOneLine(value);
    }

    return toTitleCase(value);
};

const normalizeSkills = (...sources) => {
    const seen = new Set();
    const merged = sources.flatMap((source) =>
        ensureArrayOfStrings(toSkillSourceArray(source)).flatMap((item) => splitSkillCandidates(item)),
    );

    return merged
        .map((skill) => normalizeAtsSkillName(skill))
        .filter((skill) => {
            const key = toSkillMatchKey(skill);
            if (!key || seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        })
        .slice(0, 20);
};

const normalizeLineBreaks = (value = '') =>
    String(value || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();

const compactToOneLine = (value = '') =>
    normalizeLineBreaks(value)
        .replace(/\s+/g, ' ')
        .trim();

const normalizeHeadingCandidate = (value = '') =>
    String(value || '')
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const detectSectionKeyFromHeading = (line = '') => {
    const normalizedHeading = normalizeHeadingCandidate(line);
    if (!normalizedHeading || normalizedHeading.length > 48) {
        return null;
    }

    const targetMatch = RESUME_TEXT_SECTION_MATCHERS.find(({ pattern }) => pattern.test(normalizedHeading));
    if (targetMatch) {
        return targetMatch.key;
    }

    const nonTargetHeader = RESUME_TEXT_NON_TARGET_HEADERS.some((pattern) => pattern.test(normalizedHeading));
    return nonTargetHeader ? 'other' : null;
};

const parseRoleAndCompanyFromHeading = (value = '') => {
    const heading = compactToOneLine(value);
    if (!heading) {
        return { role: '', company: '' };
    }

    const separators = [/\s+at\s+/i, /\s+-\s+/i, /\s+\|\s+/i];
    for (const separatorPattern of separators) {
        if (!separatorPattern.test(heading)) {
            continue;
        }

        const parts = heading.split(separatorPattern).map((item) => compactToOneLine(item)).filter(Boolean);
        if (parts.length >= 2) {
            return {
                role: truncateText(parts[0], 160),
                company: truncateText(parts.slice(1).join(' '), 160),
            };
        }
    }

    return {
        role: truncateText(heading, 160),
        company: '',
    };
};

const toSectionTextBlocks = (lines = [], maxBlocks = 20) => {
    const normalized = normalizeLineBreaks((Array.isArray(lines) ? lines : []).join('\n'));
    if (!normalized) {
        return [];
    }

    const blocks = normalized
        .split(/\n{2,}/)
        .map((item) => normalizeLineBreaks(item))
        .filter(Boolean);

    return (blocks.length ? blocks : [normalized]).slice(0, maxBlocks);
};

const extractAtsFocusedResumeDataFromText = (resumeText = '') => {
    const normalizedText = normalizeLineBreaks(resumeText || '');
    if (!normalizedText) {
        return {
            summary: '',
            workExperience: [],
            projects: [],
            internships: [],
        };
    }

    const lines = normalizedText
        .split('\n')
        .map((line) => String(line || '').replace(/\t/g, ' ').trimEnd());
    const sectionBuckets = {
        summary: [],
        workExperience: [],
        projects: [],
        internships: [],
    };
    const introLines = [];

    let activeSection = null;

    for (const rawLine of lines) {
        const trimmedLine = rawLine.trim();
        const detectedSection = detectSectionKeyFromHeading(trimmedLine);

        if (detectedSection && detectedSection !== 'other') {
            activeSection = detectedSection;
            continue;
        }

        if (detectedSection === 'other') {
            activeSection = null;
            continue;
        }

        if (activeSection && ATS_TARGET_SECTION_KEYS.has(activeSection)) {
            sectionBuckets[activeSection].push(trimmedLine);
            continue;
        }

        if (trimmedLine) {
            introLines.push(trimmedLine);
        }
    }

    const summaryFromSection = normalizeLineBreaks(sectionBuckets.summary.join('\n'));
    const summaryFromIntro = introLines
        .filter((line) => tokenizeWords(line).length >= 5)
        .slice(0, TARGET_SUMMARY_MAX_LINES)
        .join('\n');

    const mapWorkLikeBlocks = (blocks = [], type = 'workExperience') =>
        (Array.isArray(blocks) ? blocks : [])
            .slice(0, 12)
            .map((block) => {
                const blockLines = normalizeLineBreaks(block)
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean);
                const headerLine = blockLines[0] || '';
                const remaining = blockLines.slice(1).join('\n');
                const description = normalizeLineBreaks(remaining || headerLine);
                const parsed = parseRoleAndCompanyFromHeading(headerLine);

                if (!description) {
                    return null;
                }

                if (type === 'projects') {
                    return {
                        name: truncateText(headerLine || 'Project', 180),
                        techStack: '',
                        link: '',
                        description: truncateText(description, 1600),
                    };
                }

                return {
                    company: truncateText(parsed.company, 160),
                    role: truncateText(parsed.role, 160),
                    startDate: '',
                    endDate: '',
                    description: truncateText(description, 1800),
                };
            })
            .filter(Boolean);

    return {
        summary: summaryFromSection || summaryFromIntro || '',
        workExperience: mapWorkLikeBlocks(toSectionTextBlocks(sectionBuckets.workExperience, 18), 'workExperience'),
        projects: mapWorkLikeBlocks(toSectionTextBlocks(sectionBuckets.projects, 18), 'projects'),
        internships: mapWorkLikeBlocks(toSectionTextBlocks(sectionBuckets.internships, 12), 'internships'),
    };
};

const normalizeOneLineList = (value, max = TARGET_SHORT_LIST_ITEMS) =>
    ensureArrayOfStrings(value)
        .map((item) => compactToOneLine(item))
        .filter(Boolean)
        .slice(0, max);

const tokenizeWords = (value = '') =>
    compactToOneLine(value).match(/[A-Za-z0-9+#./-]+/g) || [];

const toWordKey = (token = '') =>
    String(token || '')
        .toLowerCase()
        .replace(/[^a-z0-9+#]/g, '');

const sanitizeToken = (token = '') =>
    String(token || '')
        .trim()
        .replace(/^[,.;:!?]+/, '')
        .replace(/[,.;:!?]+$/, '');

const dedupeTokensCaseInsensitive = (tokens = []) => {
    const seen = new Set();
    return (Array.isArray(tokens) ? tokens : []).filter((token) => {
        const key = String(token || '').toLowerCase();
        if (!key || seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};

const distributeWordsAcrossLines = (totalWords = TARGET_SUMMARY_WORDS, lines = TARGET_SUMMARY_LINES) => {
    const safeLines = Math.max(1, Number(lines) || TARGET_SUMMARY_LINES);
    const base = Math.floor(totalWords / safeLines);
    const remainder = totalWords % safeLines;
    return Array.from({ length: safeLines }, (_value, index) => base + (index < remainder ? 1 : 0));
};

const fillTokensToTarget = (tokens = [], targetWordCount = 0, extraPools = []) => {
    const result = [...(Array.isArray(tokens) ? tokens : [])].slice(0, targetWordCount);
    if (result.length >= targetWordCount) {
        return result.slice(0, targetWordCount);
    }

    const pools = Array.isArray(extraPools) ? extraPools : [];
    for (const pool of pools) {
        for (const token of Array.isArray(pool) ? pool : []) {
            if (result.length >= targetWordCount) {
                break;
            }
            const safeToken = String(token || '').trim();
            if (!safeToken) {
                continue;
            }
            result.push(safeToken);
        }
        if (result.length >= targetWordCount) {
            break;
        }
    }

    while (result.length < targetWordCount) {
        result.push('delivery');
    }

    return result.slice(0, targetWordCount);
};

const pickActionVerb = (seed = '') => {
    const normalized = compactToOneLine(seed || '');
    if (!normalized) {
        return ACTION_VERBS[0];
    }
    const index = normalized.length % ACTION_VERBS.length;
    return ACTION_VERBS[index];
};

const pickUniqueActionVerb = ({ seed = '', bulletIndex = 0, usedWordKeys = new Set() }) => {
    const baseSeed = compactToOneLine(seed || '');
    const startIndex = (baseSeed.length + Number(bulletIndex || 0)) % ACTION_VERBS.length;

    for (let offset = 0; offset < ACTION_VERBS.length; offset += 1) {
        const candidate = ACTION_VERBS[(startIndex + offset) % ACTION_VERBS.length];
        const candidateKey = toWordKey(candidate);
        if (!usedWordKeys.has(candidateKey)) {
            return candidate;
        }
    }

    return ACTION_VERBS[startIndex];
};

const pushUniqueBulletToken = ({
    token,
    result = [],
    lineWordKeys = new Set(),
    usedWordKeys = new Set(),
    avoidUsedWords = true,
}) => {
    const safeToken = sanitizeToken(token);
    const key = toWordKey(safeToken);

    if (!safeToken || !key || lineWordKeys.has(key)) {
        return false;
    }

    if (avoidUsedWords && usedWordKeys.has(key)) {
        return false;
    }

    result.push(safeToken);
    lineWordKeys.add(key);
    return true;
};

const pickEndingToken = (lineWordKeys = new Set(), usedWordKeys = new Set()) => {
    const withGlobalUniqueness = BULLET_ENDING_TOKENS.find((token) => {
        const key = toWordKey(token);
        return key && !lineWordKeys.has(key) && !usedWordKeys.has(key);
    });

    if (withGlobalUniqueness) {
        return withGlobalUniqueness;
    }

    const withLineUniqueness = BULLET_ENDING_TOKENS.find((token) => {
        const key = toWordKey(token);
        return key && !lineWordKeys.has(key);
    });

    return withLineUniqueness || BULLET_ENDING_TOKENS[0];
};

const buildSummaryContextTokens = (resumeData = {}) => {
    const safeResumeData = ensureObject(resumeData);
    const personal = ensureObject(safeResumeData.personalDetails);
    const workLabels = extractWorkLabels(safeResumeData);
    const internshipLabels = extractInternshipLabels(safeResumeData);
    const projectLabels = extractProjectLabels(safeResumeData);

    const sources = [personal.title, ...workLabels, ...internshipLabels, ...projectLabels];

    return dedupeTokensCaseInsensitive(
        sources
            .flatMap((value) => tokenizeWords(value))
            .filter((token) => token.length > 2),
    );
};

const buildDefaultProfessionalSummary = (resumeData = {}) => {
    const title = deriveProfessionalTitle(resumeData) || 'Professional';
    const lines = DEFAULT_PROFESSIONAL_SUMMARY_LINES.map((line, index) => {
        if (index === 0) {
            return `${title} delivers dependable outcomes with structured ownership and accountability.`;
        }
        return line;
    });
    return lines.join('\n');
};

const pickLabelTokens = (value = '', maxTokens = 3) =>
    tokenizeWords(value)
        .filter(Boolean)
        .slice(0, maxTokens);

const summaryWordCount = (value = '') => tokenizeWords(value).length;

const appendWordToSentence = (line = '', token = '') => {
    const base = compactToOneLine(line).replace(/[.!?]+$/, '').trim();
    const safeToken = sanitizeToken(token);
    if (!base || !safeToken) {
        return ensureSentenceEnding(base || line);
    }
    return ensureSentenceEnding(`${base} ${safeToken}`);
};

const trimSentenceByOneWord = (line = '', minWords = 7) => {
    const tokens = tokenizeWords(line);
    if (tokens.length <= minWords) {
        return ensureSentenceEnding(line);
    }
    return ensureSentenceEnding(tokens.slice(0, -1).join(' '));
};

const fitSummaryLinesToWordRange = (lines = [], options = {}) => {
    const {
        minWords = TARGET_SUMMARY_MIN_WORDS,
        maxWords = TARGET_SUMMARY_MAX_WORDS,
        targetWords = TARGET_SUMMARY_WORDS,
        resumeData = {},
    } = ensureObject(options);

    const safeLines = dedupeLines(
        (Array.isArray(lines) ? lines : [])
            .map((line) => ensureStrongSummaryLineEnding(line))
            .filter(Boolean),
    );
    const requestedLineCount = safeLines.length || TARGET_SUMMARY_LINES;
    const targetLineCount = Math.min(TARGET_SUMMARY_MAX_LINES, Math.max(TARGET_SUMMARY_MIN_LINES, requestedLineCount));
    const generatedFallbackLines = buildSummaryGeneratorLines(resumeData);
    const fallbackLines = generatedFallbackLines.length ? generatedFallbackLines : DEFAULT_PROFESSIONAL_SUMMARY_LINES;

    const seeded = fillToFixedLineCount(safeLines, targetLineCount, fallbackLines, {
        allowVerbRewrites: false,
    }).map((line) => ensureStrongSummaryLineEnding(line));

    const role = deriveProfessionalTitle(resumeData);
    if (role && seeded.length) {
        const firstLine = compactToOneLine(seeded[0]);
        const roleMatcher = new RegExp(`^${escapeRegExp(role)}`, 'i');
        if (!roleMatcher.test(firstLine)) {
            seeded[0] = ensureStrongSummaryLineEnding(`${role} ${lowerFirst(firstLine)}`);
        }
    }

    const tuningPool = dedupeTokensCaseInsensitive([
        ...buildSummaryContextTokens(resumeData),
        ...SUMMARY_FALLBACK_TOKENS,
        'delivers',
        'builds',
        'outcomes',
        'execution',
        'impact',
        'ownership',
    ]);
    let tuningCursor = 0;
    let totalWords = summaryWordCount(seeded.join(' '));

    while (totalWords < minWords) {
        const token = tuningPool[tuningCursor % Math.max(tuningPool.length, 1)] || 'outcomes';
        tuningCursor += 1;
        seeded[targetLineCount - 1] = appendWordToSentence(seeded[targetLineCount - 1], token);
        totalWords = summaryWordCount(seeded.join(' '));
    }

    const trimOrder = Array.from({ length: targetLineCount }, (_v, idx) => idx);
    while (totalWords > maxWords) {
        const before = totalWords;
        for (const lineIndex of trimOrder) {
            const currentLineWords = summaryWordCount(seeded[lineIndex]);
            if (currentLineWords <= 7) {
                continue;
            }
            seeded[lineIndex] = trimSentenceByOneWord(seeded[lineIndex], 7);
            totalWords = summaryWordCount(seeded.join(' '));
            if (totalWords < before) {
                break;
            }
        }

        if (totalWords >= before) {
            break;
        }
    }

    if (totalWords < minWords || totalWords > maxWords) {
        return fillToFixedLineCount(generatedFallbackLines, targetLineCount, DEFAULT_PROFESSIONAL_SUMMARY_LINES, {
            allowVerbRewrites: false,
        }).slice(0, targetLineCount);
    }

    while (totalWords < targetWords && totalWords < maxWords) {
        const token = tuningPool[tuningCursor % Math.max(tuningPool.length, 1)] || 'impact';
        tuningCursor += 1;
        seeded[targetLineCount - 1] = appendWordToSentence(seeded[targetLineCount - 1], token);
        totalWords = summaryWordCount(seeded.join(' '));
    }

    return seeded.slice(0, targetLineCount).map((line) => ensureStrongSummaryLineEnding(line));
};

const buildContextDrivenSummary = (resumeData = {}) => {
    const title = deriveProfessionalTitle(resumeData);
    const workLabel = toDisplayList(extractWorkLabels(resumeData), 2);
    const internshipLabel = toDisplayList(extractInternshipLabels(resumeData), 2);
    const projectLabel = toDisplayList(extractProjectLabels(resumeData), 2);
    const primaryContext = resolvePrimarySummaryContext(resumeData);
    const hasContextData =
        Boolean(compactToOneLine(resumeData?.personalDetails?.title || '')) ||
        hasAnyText(workLabel) ||
        hasAnyText(internshipLabel) ||
        hasAnyText(projectLabel);

    if (!hasContextData) {
        return buildDefaultProfessionalSummary(resumeData);
    }

    const lines = [];
    lines.push(`${title} delivers role-aligned outcomes with accountable execution.`);

    if (primaryContext === 'workExperience' && workLabel) {
        lines.push(`${title} drives measurable execution in ${workLabel} responsibilities.`);
    } else if (primaryContext === 'internships' && internshipLabel) {
        lines.push(`${title} builds internship deliverables in ${internshipLabel} engagements.`);
    } else {
        lines.push(`${title} builds practical solutions with reliable delivery ownership.`);
    }

    if (projectLabel) {
        lines.push(`${title} builds ${projectLabel} solutions with implementation rigor.`);
    } else {
        lines.push(`${title} delivers consistent outcomes across core assigned initiatives.`);
    }

    lines.push(`${title} communicates value through concise and meaningful execution results.`);
    lines.push(`${title} sustains quality, clarity, and end-to-end professional impact.`);

    return fitSummaryLinesToWordRange(lines, { resumeData }).join('\n');
};

const enforceSummaryFormat = (lines = [], resumeData = {}) => {
    const normalizedLines = dedupeLines(
        (Array.isArray(lines) ? lines : [])
            .map((line) => ensureStrongSummaryLineEnding(line))
            .filter(Boolean),
    );

    if (!normalizedLines.length) {
        return buildContextDrivenSummary(resumeData);
    }

    return fitSummaryLinesToWordRange(normalizedLines, { resumeData }).join('\n');
};

const enforceBulletWordCount = (line = '', options = {}) => {
    const { contextLabel = '', sourceText = '', bulletIndex = 0, usedWordKeys = new Set() } = ensureObject(options);
    const baseText = compactToOneLine(line) || compactToOneLine(sourceText);
    const normalizedBaseText = stripLeadingActionVerb(baseText);
    const baseTokens = dedupeTokensCaseInsensitive(tokenizeWords(normalizedBaseText).filter((token) => token.length > 1));
    const contextTokens = dedupeTokensCaseInsensitive(
        tokenizeWords([contextLabel, stripLeadingActionVerb(sourceText)].filter(Boolean).join(' '))
            .filter((token) => token.length > 2),
    );
    const tokenPools = [baseTokens, contextTokens];

    const result = [];
    const lineWordKeys = new Set();
    const requiredVerb = pickUniqueActionVerb({
        seed: contextLabel || sourceText || line || pickActionVerb(baseText),
        bulletIndex,
        usedWordKeys,
    });

    pushUniqueBulletToken({
        token: requiredVerb,
        result,
        lineWordKeys,
        usedWordKeys,
        avoidUsedWords: false,
    });

    const addPoolTokens = (pool = [], avoidUsedWords = true) => {
        for (const token of Array.isArray(pool) ? pool : []) {
            if (result.length >= TARGET_BULLET_MAX_WORDS) {
                break;
            }
            pushUniqueBulletToken({
                token,
                result,
                lineWordKeys,
                usedWordKeys,
                avoidUsedWords,
            });
        }
    };

    addPoolTokens(baseTokens, true);
    addPoolTokens(contextTokens, true);
    addPoolTokens(baseTokens, false);
    addPoolTokens(contextTokens, false);

    while (result.length < TARGET_BULLET_MIN_WORDS) {
        const fallbackToken = pickEndingToken(lineWordKeys, usedWordKeys) || 'outcomes';
        const appended = pushUniqueBulletToken({
            token: fallbackToken,
            result,
            lineWordKeys,
            usedWordKeys,
            avoidUsedWords: false,
        });
        if (!appended) {
            const emergencyToken = result.length % 2 === 0 ? 'delivery' : 'impact';
            pushUniqueBulletToken({
                token: emergencyToken,
                result,
                lineWordKeys,
                usedWordKeys,
                avoidUsedWords: false,
            });
        }
    }

    let finalTokens = [...result];
    if (finalTokens.length > TARGET_BULLET_MAX_WORDS) {
        finalTokens = finalTokens.slice(0, TARGET_BULLET_MAX_WORDS);
    }

    const finalWordKeys = new Set(finalTokens.map((token) => toWordKey(token)).filter(Boolean));
    const endingToken = pickEndingToken(finalWordKeys, usedWordKeys);
    if (endingToken) {
        finalTokens[finalTokens.length - 1] = endingToken;
    }

    finalTokens.forEach((token) => {
        const key = toWordKey(token);
        if (key) {
            usedWordKeys.add(key);
        }
    });

    return ensureSentenceEnding(finalTokens.join(' '));
};

const normalizeToLines = (value = '') =>
    normalizeLineBreaks(value)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

const normalizeToSentences = (value = '') =>
    normalizeLineBreaks(value)
        .split(/(?<=[.!?])\s+/)
        .map((line) => line.trim())
        .filter(Boolean);

const isSummaryFormatCompliant = (value = '') => {
    const lines = normalizeToLines(value);
    if (lines.length < TARGET_SUMMARY_MIN_LINES || lines.length > TARGET_SUMMARY_MAX_LINES) {
        return false;
    }

    const wordCount = tokenizeWords(lines.join(' ')).length;
    return wordCount >= TARGET_SUMMARY_MIN_WORDS && wordCount <= TARGET_SUMMARY_MAX_WORDS;
};

const dedupeLines = (lines = []) => {
    const seen = new Set();
    return lines.filter((line) => {
        const normalized = String(line || '').trim();
        if (!normalized) {
            return false;
        }

        const key = normalized.toLowerCase();
        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
};

const getEntryDescriptions = (list = []) =>
    (Array.isArray(list) ? list : [])
        .map((item) => normalizeLineBreaks(item?.description || ''))
        .filter(Boolean);

const buildSummaryFallbackLines = (resumeData = {}) => {
    const personalSummary = normalizeLineBreaks(resumeData?.personalDetails?.summary || '');
    const workDescriptions = getEntryDescriptions(resumeData?.workExperience);
    const projectDescriptions = getEntryDescriptions(resumeData?.projects);
    const internshipDescriptions = getEntryDescriptions(resumeData?.internships);
    const hasProfessionalContext = workDescriptions.length > 0 || internshipDescriptions.length > 0 || projectDescriptions.length > 0;
    const sourceTexts = [
        ...workDescriptions,
        ...internshipDescriptions,
        ...projectDescriptions,
        ...(hasProfessionalContext ? [] : [personalSummary]),
    ];

    const lines = sourceTexts.flatMap((text) => {
        const lineTokens = normalizeToLines(text);
        if (lineTokens.length > 1) {
            return lineTokens;
        }
        return normalizeToSentences(text);
    });

    return dedupeLines(lines).slice(0, TARGET_SUMMARY_MAX_LINES);
};

const ensureSentenceEnding = (value = '') => {
    const line = compactToOneLine(value);
    if (!line) {
        return '';
    }

    return /[.!?]$/.test(line) ? line : `${line}.`;
};

const SUMMARY_WEAK_ENDING_WORDS = new Set([
    'and',
    'or',
    'with',
    'while',
    'through',
    'across',
    'into',
    'for',
    'to',
    'from',
    'of',
    'in',
    'on',
    'at',
    'by',
    'as',
]);

const ensureStrongSummaryLineEnding = (value = '') => {
    const normalized = compactToOneLine(value).replace(/[.!?]+$/, '').trim();
    if (!normalized) {
        return '';
    }

    const tokens = normalized.split(/\s+/).filter(Boolean);
    if (!tokens.length) {
        return '';
    }

    const lastIndex = tokens.length - 1;
    const lastWord = String(tokens[lastIndex] || '').toLowerCase();
    if (SUMMARY_WEAK_ENDING_WORDS.has(lastWord)) {
        tokens[lastIndex] = 'effectively';
    }

    return ensureSentenceEnding(tokens.join(' '));
};

const lowerFirst = (value = '') => {
    const text = String(value || '');
    if (!text) {
        return '';
    }
    if (text.length > 1 && text[0] === text[0].toUpperCase() && text[1] === text[1].toUpperCase()) {
        return text;
    }
    return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
};

const stripLeadingActionVerb = (value = '') =>
    compactToOneLine(value)
        .replace(/[.!?]+$/, '')
        .replace(
            /^(delivered|engineered|implemented|optimized|architected|streamlined|automated|integrated|developed|deployed|enhanced|built|led)\s+/i,
            '',
        )
        .trim();

const buildVerbRewrites = (lines = [], max = TARGET_BULLET_LINES) => {
    const seedLines = dedupeLines((Array.isArray(lines) ? lines : []).map((line) => stripLeadingActionVerb(line)).filter(Boolean));
    const rewritten = [];

    seedLines.forEach((seedLine) => {
        ACTION_VERBS.forEach((verb) => {
            if (rewritten.length >= max * 4) {
                return;
            }
            const rewrittenLine = ensureSentenceEnding(`${verb} ${lowerFirst(seedLine)}`);
            if (rewrittenLine) {
                rewritten.push(rewrittenLine);
            }
        });
    });

    return dedupeLines(rewritten).slice(0, max * 3);
};

const toDisplayList = (values = [], max = 3) =>
    dedupeLines((Array.isArray(values) ? values : []).map((item) => compactToOneLine(item)).filter(Boolean))
        .slice(0, max)
        .join(', ');

const extractWorkLabels = (resumeData = {}) =>
    (Array.isArray(resumeData?.workExperience) ? resumeData.workExperience : [])
        .map((item) => {
            const role = compactToOneLine(item?.role || '');
            const company = compactToOneLine(item?.company || '');
            if (role && company) {
                return `${role} at ${company}`;
            }
            return role || company;
        })
        .filter(Boolean);

const extractProjectLabels = (resumeData = {}) =>
    (Array.isArray(resumeData?.projects) ? resumeData.projects : [])
        .map((item) => compactToOneLine(item?.name || item?.title || ''))
        .filter(Boolean);

const extractInternshipLabels = (resumeData = {}) =>
    (Array.isArray(resumeData?.internships) ? resumeData.internships : [])
        .map((item) => {
            const role = compactToOneLine(item?.role || '');
            const company = compactToOneLine(item?.company || '');
            if (role && company) {
                return `${role} at ${company}`;
            }
            return company || role;
        })
        .filter(Boolean);

const resolvePrimarySummaryContext = (resumeData = {}) => {
    const hasWorkContext = extractWorkLabels(resumeData).length > 0;
    const hasInternshipContext = extractInternshipLabels(resumeData).length > 0;

    if (hasWorkContext) {
        return 'workExperience';
    }

    if (hasInternshipContext) {
        return 'internships';
    }

    return '';
};

const describeProvidedSummaryContext = (resumeData = {}) => {
    const primaryContext = resolvePrimarySummaryContext(resumeData);
    const hasProjects = extractProjectLabels(resumeData).length > 0;

    if (primaryContext === 'workExperience') {
        return hasProjects
            ? 'user-provided role title, work experience, and project entries'
            : 'user-provided role title and work experience entries';
    }

    if (primaryContext === 'internships') {
        return hasProjects
            ? 'user-provided role title, internship entries, and project entries'
            : 'user-provided role title and internship entries';
    }

    if (hasProjects) {
        return 'user-provided role title and project entries';
    }

    return 'user-provided role title details';
};

const deriveProfessionalTitle = (resumeData = {}) => {
    const explicitTitle = compactToOneLine(resumeData?.personalDetails?.title || '');
    if (explicitTitle) {
        return explicitTitle;
    }

    const firstWorkRole = compactToOneLine(
        (Array.isArray(resumeData?.workExperience) ? resumeData.workExperience : [])[0]?.role || '',
    );
    if (firstWorkRole) {
        return firstWorkRole;
    }

    const firstInternRole = compactToOneLine(
        (Array.isArray(resumeData?.internships) ? resumeData.internships : [])[0]?.role || '',
    );
    if (firstInternRole) {
        return firstInternRole;
    }

    return 'Professional';
};

const buildSummaryGeneratorLines = (resumeData = {}) => {
    const title = deriveProfessionalTitle(resumeData);
    const workLabels = extractWorkLabels(resumeData);
    const projectLabels = extractProjectLabels(resumeData);
    const internshipLabels = extractInternshipLabels(resumeData);
    const primaryContext = resolvePrimarySummaryContext(resumeData);
    const workText = toDisplayList(workLabels, 2);
    const projectText = toDisplayList(projectLabels, 2);
    const hasProjectContext = Boolean(projectText);
    const internshipText = toDisplayList(internshipLabels, 2);

    const generated = [];

    generated.push(`${title} delivers role-aligned outcomes through disciplined execution.`);

    if (primaryContext === 'workExperience' && workText) {
        generated.push(`${title} executes ${workText} responsibilities with measurable consistency.`);
    } else if (primaryContext === 'internships' && internshipText) {
        generated.push(`${title} drives ${internshipText} internship responsibilities with ownership.`);
    } else if (hasProjectContext) {
        generated.push(`${title} builds delivery-focused solutions from ${projectText} initiatives.`);
    }

    if (projectText) {
        generated.push(`${title} builds ${projectText} deliverables with implementation rigor.`);
    } else if (hasProjectContext || workText || internshipText) {
        generated.push(`${title} delivers measurable value through accountable collaboration and planning.`);
    } else {
        generated.push(`${title} contributes dependable outcomes through focused professional execution.`);
    }

    generated.push(`${title} maintains concise, meaningful, and outcome-driven professional communication.`);

    return dedupeLines(generated.map((line) => ensureSentenceEnding(line)).filter(Boolean));
};

const fillToFixedLineCount = (lines = [], target = TARGET_SUMMARY_LINES, fallbackLines = [], options = {}) => {
    const { allowVerbRewrites = true } = ensureObject(options);
    const normalized = dedupeLines(
        (Array.isArray(lines) ? lines : [])
            .map((line) => ensureSentenceEnding(line))
            .filter(Boolean),
    );
    const fallback = dedupeLines(
        (Array.isArray(fallbackLines) ? fallbackLines : [])
            .map((line) => ensureSentenceEnding(line))
            .filter(Boolean),
    );

    const combined = dedupeLines([...normalized, ...fallback]);

    if (combined.length >= target) {
        return combined.slice(0, target);
    }

    if (allowVerbRewrites) {
        const rewritten = buildVerbRewrites(combined, target);
        for (const line of rewritten) {
            if (combined.length >= target) {
                break;
            }
            const safeLine = ensureSentenceEnding(line);
            if (!combined.some((item) => item.toLowerCase() === safeLine.toLowerCase())) {
                combined.push(safeLine);
            }
        }
    }

    const seedLines = [...combined];
    let cursor = 0;
    while (combined.length < target && seedLines.length) {
        combined.push(seedLines[cursor % seedLines.length]);
        cursor += 1;
    }

    return combined.slice(0, target);
};

const normalizeSummary = (value = '', resumeData = {}) => {
    const cleaned = normalizeLineBreaks(value).replace(/^[\u2022*-]+\s*/gm, '');

    if (isSummaryFormatCompliant(cleaned)) {
        return normalizeToLines(cleaned)
            .slice(0, TARGET_SUMMARY_MAX_LINES)
            .map((line) => ensureSentenceEnding(line))
            .join('\n');
    }

    if (!cleaned) {
        return buildContextDrivenSummary(resumeData);
    }

    const primaryLines = cleaned ? normalizeToLines(cleaned) : [];
    const candidateLines = primaryLines.length ? primaryLines : normalizeToSentences(cleaned);
    const fallbackLines = buildSummaryFallbackLines(resumeData);
    const expandedLines = dedupeLines(
        candidateLines.flatMap((line) =>
            String(line || '')
                .split(/[,;]\s+/)
                .map((part) => part.trim())
                .filter(Boolean),
        ),
    );
    const generatedLines = buildSummaryGeneratorLines(resumeData);
    const finalLines = fillToFixedLineCount(
        dedupeLines([...candidateLines, ...expandedLines]),
        TARGET_SUMMARY_MAX_LINES,
        [...fallbackLines, ...generatedLines],
        { allowVerbRewrites: false },
    );

    return enforceSummaryFormat(finalLines, resumeData);
};

const normalizeAtsOnlySummary = (value = '') => {
    const cleaned = normalizeLineBreaks(value).replace(/^[\u2022*-]+\s*/gm, '');
    if (!cleaned) {
        return '';
    }

    const lines = normalizeToLines(cleaned);
    if (lines.length) {
        return lines
            .slice(0, TARGET_SUMMARY_MAX_LINES)
            .map((line) => ensureSentenceEnding(line))
            .join('\n');
    }

    return ensureSentenceEnding(compactToOneLine(cleaned));
};

const toCandidateDescriptionLines = (value = '') => {
    const cleaned = normalizeLineBreaks(value);
    if (!cleaned) {
        return [];
    }

    const bulletPrefixRegex = /^[\u2022*-]+\s*/;
    const explicitLines = cleaned
        .split('\n')
        .map((line) => line.replace(bulletPrefixRegex, '').trim())
        .filter(Boolean);

    const candidateLines = explicitLines.length
        ? explicitLines
        : cleaned
              .split(/(?<=[.;])\s+/)
              .map((line) => line.replace(bulletPrefixRegex, '').trim())
              .filter(Boolean);

    return dedupeLines(candidateLines);
};

const expandDescriptionLines = (lines = []) =>
    dedupeLines(
        lines.flatMap((line) =>
            String(line || '')
                .split(/[,;]\s+/)
                .map((part) => part.trim())
                .filter(Boolean),
        ),
    );

const normalizeBulletItem = (value = '') =>
    String(value || '')
        .replace(/^[\u2022*-]+\s*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeBulletLineKey = (value = '') =>
    compactToOneLine(value)
        .toLowerCase()
        .replace(/[.!?]+$/g, '')
        .trim();

const buildUniqueBulletLines = ({ lines = [], contextLabel = '', sourceText = '' }) => {
    const usedWordKeys = new Set();
    const usedLineKeys = new Set();
    const safeLines = Array.isArray(lines) ? lines : [];
    const results = [];

    for (let index = 0; index < safeLines.length; index += 1) {
        const baseLine = String(safeLines[index] || '').trim();
        let candidate = enforceBulletWordCount(baseLine, {
            contextLabel,
            sourceText,
            bulletIndex: index,
            usedWordKeys,
        });

        let candidateKey = normalizeBulletLineKey(candidate);
        let retryCount = 0;
        while (candidateKey && usedLineKeys.has(candidateKey) && retryCount < 4) {
            candidate = enforceBulletWordCount('', {
                contextLabel: `${contextLabel} variation ${index + retryCount + 1}`,
                sourceText: [sourceText, baseLine, contextLabel].join(' '),
                bulletIndex: index + retryCount + 1,
                usedWordKeys,
            });
            candidateKey = normalizeBulletLineKey(candidate);
            retryCount += 1;
        }

        if (!candidateKey || usedLineKeys.has(candidateKey)) {
            continue;
        }

        usedLineKeys.add(candidateKey);
        results.push(candidate);
    }

    return results.slice(0, TARGET_BULLET_LINES);
};

const buildContextFallbackBullets = (contextLabel = '') => {
    const context = compactToOneLine(contextLabel || '');
    const scopedContext = context ? ` in ${context}` : '';

    return [
        `Delivered role responsibilities${scopedContext}.`,
        `Implemented execution workflows${scopedContext}.`,
        `Enhanced consistency and quality${scopedContext}.`,
    ];
};

const normalizeBulletList = ({
    bullets = [],
    text = '',
    fallbackText = '',
    contextLabel = '',
    allowSyntheticFallback = false,
}) => {
    const fromArray = ensureArrayOfStrings(bullets).map((item) => normalizeBulletItem(item)).filter(Boolean);
    const fromText = toCandidateDescriptionLines(text);
    const fallbackLines = toCandidateDescriptionLines(fallbackText);
    const normalizedContextLabel = compactToOneLine(contextLabel || '');
    const normalizedSourceText = [text, fallbackText, normalizedContextLabel].filter(Boolean).join(' ');

    let mergedLines = dedupeLines([...fromArray, ...fromText, ...fallbackLines]).slice(0, TARGET_BULLET_LINES);

    if (mergedLines.length < TARGET_BULLET_LINES && allowSyntheticFallback) {
        const expandedLines = expandDescriptionLines([...fromText, ...fallbackLines]);
        mergedLines = dedupeLines([...mergedLines, ...expandedLines]).slice(0, TARGET_BULLET_LINES);
    }

    if (mergedLines.length < TARGET_BULLET_LINES && allowSyntheticFallback) {
        const generated = buildContextFallbackBullets(contextLabel);
        mergedLines = dedupeLines([...mergedLines, ...generated]).slice(0, TARGET_BULLET_LINES);
    }

    if (!mergedLines.length) {
        return [];
    }

    const fixedLines = fillToFixedLineCount(
        mergedLines,
        TARGET_BULLET_LINES,
        mergedLines.length ? mergedLines : buildContextFallbackBullets(contextLabel),
        {
            allowVerbRewrites: mergedLines.length > 0,
        },
    );

    return buildUniqueBulletLines({
        lines: fixedLines.map((line) => normalizeBulletItem(line)),
        contextLabel: normalizedContextLabel,
        sourceText: normalizedSourceText,
    });
};

const buildSectionContextLabel = ({ profession = '', sectionLabel = '', primaryLabel = '', secondaryLabel = '' }) =>
    [profession, sectionLabel, primaryLabel, secondaryLabel]
        .map((item) => compactToOneLine(item))
        .filter(Boolean)
        .join(' ')
        .trim();

const deriveProfessionFromSourceItems = (sourceItems = []) => {
    const firstRole = (Array.isArray(sourceItems) ? sourceItems : [])
        .map((item) => compactToOneLine(item?.role || ''))
        .find(Boolean);

    return firstRole || 'Technology Professional';
};

const normalizeWorkExperienceSection = ({ payloadItems, sourceItems, profession = '', allowSyntheticFallback = true }) => {
    const safePayloadItems = Array.isArray(payloadItems) ? payloadItems : [];
    const safeSourceItems = Array.isArray(sourceItems) ? sourceItems : [];
    const effectiveProfession = compactToOneLine(profession) || deriveProfessionFromSourceItems(safeSourceItems);

    return safeSourceItems
        .slice(0, 30)
        .map((sourceItem, index) => {
            const safePayload = ensureObject(safePayloadItems[index]);

            return {
                company: String(safePayload.company || sourceItem.company || '').trim(),
                role: String(safePayload.role || sourceItem.role || '').trim(),
                bullets: normalizeBulletList({
                    bullets: safePayload.bullets,
                    text: safePayload.improvedDescription || safePayload.description || '',
                    fallbackText: sourceItem.description || '',
                    allowSyntheticFallback,
                    contextLabel: buildSectionContextLabel({
                        profession: effectiveProfession,
                        sectionLabel: 'work experience',
                        primaryLabel: safePayload.role || sourceItem.role || '',
                        secondaryLabel: safePayload.company || sourceItem.company || '',
                    }),
                }),
            };
        })
        .filter((item) => hasAnyText(item.company, item.role, ...item.bullets));
};

const normalizeProjectsSection = ({ payloadItems, sourceItems, profession = '', allowSyntheticFallback = true }) => {
    const safePayloadItems = Array.isArray(payloadItems) ? payloadItems : [];
    const safeSourceItems = Array.isArray(sourceItems) ? sourceItems : [];
    const effectiveProfession = compactToOneLine(profession) || 'Technology Professional';

    return safeSourceItems
        .slice(0, 30)
        .map((sourceItem, index) => {
            const safePayload = ensureObject(safePayloadItems[index]);
            const title = String(safePayload.title || safePayload.name || sourceItem.name || '').trim();

            return {
                title,
                bullets: normalizeBulletList({
                    bullets: safePayload.bullets,
                    text: safePayload.improvedDescription || safePayload.description || '',
                    fallbackText: sourceItem.description || '',
                    allowSyntheticFallback,
                    contextLabel: buildSectionContextLabel({
                        profession: effectiveProfession,
                        sectionLabel: 'project',
                        primaryLabel: title || sourceItem.name || 'delivery',
                        secondaryLabel: sourceItem.techStack || '',
                    }),
                }),
            };
        })
        .filter((item) => hasAnyText(item.title, ...item.bullets));
};

const normalizeInternshipsSection = ({ payloadItems, sourceItems, profession = '', allowSyntheticFallback = true }) => {
    const safePayloadItems = Array.isArray(payloadItems) ? payloadItems : [];
    const safeSourceItems = Array.isArray(sourceItems) ? sourceItems : [];
    const effectiveProfession = compactToOneLine(profession) || deriveProfessionFromSourceItems(safeSourceItems);

    return safeSourceItems
        .slice(0, 30)
        .map((sourceItem, index) => {
            const safePayload = ensureObject(safePayloadItems[index]);

            return {
                company: String(safePayload.company || sourceItem.company || '').trim(),
                role: String(safePayload.role || sourceItem.role || '').trim(),
                bullets: normalizeBulletList({
                    bullets: safePayload.bullets,
                    text: safePayload.improvedDescription || safePayload.description || '',
                    fallbackText: sourceItem.description || '',
                    allowSyntheticFallback,
                    contextLabel: buildSectionContextLabel({
                        profession: effectiveProfession,
                        sectionLabel: 'internship',
                        primaryLabel: safePayload.role || sourceItem.role || '',
                        secondaryLabel: safePayload.company || sourceItem.company || '',
                    }),
                }),
            };
        })
        .filter((item) => hasAnyText(item.company, ...item.bullets));
};

const sanitizeResumeDataForPrompt = (resumeData = {}) => {
    const safeResumeData = ensureObject(resumeData);
    const rawPersonalDetails = ensureObject(safeResumeData.personalDetails);
    const personalDetails = {
        fullName: truncateText(rawPersonalDetails.fullName, 120),
        email: truncateText(rawPersonalDetails.email, 180),
        phone: truncateText(rawPersonalDetails.phone, 60),
        location: truncateText(rawPersonalDetails.location, 120),
        title: truncateText(rawPersonalDetails.title, 120),
        summary: truncateText(rawPersonalDetails.summary, 1600),
        linkedin: truncateText(rawPersonalDetails.linkedin, 220),
        website: truncateText(rawPersonalDetails.website, 220),
    };

    const workExperience = (Array.isArray(safeResumeData.workExperience) ? safeResumeData.workExperience : [])
        .map((item) => {
            const safeItem = ensureObject(item);
            return {
                company: truncateText(safeItem.company, 160),
                role: truncateText(safeItem.role, 160),
                startDate: truncateText(safeItem.startDate, 40),
                endDate: truncateText(safeItem.endDate, 40),
                description: truncateText(safeItem.description, 1800),
            };
        })
        .slice(0, 30)
        .filter((item) => hasAnyText(item.company, item.role, item.startDate, item.endDate, item.description));

    const projects = (Array.isArray(safeResumeData.projects) ? safeResumeData.projects : [])
        .map((item) => {
            const safeItem = ensureObject(item);
            return {
                name: truncateText(safeItem.name, 180),
                techStack: truncateText(safeItem.techStack, 500),
                link: truncateText(safeItem.link, 260),
                description: truncateText(safeItem.description, 1600),
            };
        })
        .slice(0, 30)
        .filter((item) => hasAnyText(item.name, item.techStack, item.link, item.description));

    const internships = (Array.isArray(safeResumeData.internships) ? safeResumeData.internships : [])
        .map((item) => {
            const safeItem = ensureObject(item);
            return {
                company: truncateText(safeItem.company, 160),
                role: truncateText(safeItem.role, 160),
                startDate: truncateText(safeItem.startDate, 40),
                endDate: truncateText(safeItem.endDate, 40),
                description: truncateText(safeItem.description, 1600),
            };
        })
        .slice(0, 20)
        .filter((item) => hasAnyText(item.company, item.role, item.startDate, item.endDate, item.description));

    const education = (Array.isArray(safeResumeData.education) ? safeResumeData.education : [])
        .map((item) => {
            const safeItem = ensureObject(item);
            return {
                institution: truncateText(safeItem.institution, 180),
                degree: truncateText(safeItem.degree, 220),
                startYear: truncateText(safeItem.startYear, 40),
                endYear: truncateText(safeItem.endYear, 40),
                description: truncateText(safeItem.description, 500),
            };
        })
        .slice(0, 20)
        .filter((item) => hasAnyText(item.institution, item.degree, item.startYear, item.endYear, item.description));

    return {
        personalDetails,
        workExperience,
        projects,
        internships,
        education,
        skills: normalizeSkills(safeResumeData.skills),
        certifications: normalizeOneLineList(safeResumeData.certifications, TARGET_SHORT_LIST_ITEMS),
        achievements: normalizeOneLineList(safeResumeData.achievements, TARGET_SHORT_LIST_ITEMS),
        hobbies: normalizeOneLineList(safeResumeData.hobbies, TARGET_SHORT_LIST_ITEMS),
    };
};

const buildAtsOnlyResumeData = ({ resumeData = {}, resumeText = '' }) => {
    const base = sanitizeResumeDataForPrompt(resumeData);
    const extracted = extractAtsFocusedResumeDataFromText(resumeText);

    return {
        personalDetails: {
            ...base.personalDetails,
            summary: truncateText(base.personalDetails.summary || extracted.summary || '', 1600),
        },
        workExperience: (base.workExperience.length ? base.workExperience : extracted.workExperience).slice(0, 20),
        projects: (base.projects.length ? base.projects : extracted.projects).slice(0, 20),
        internships: (base.internships.length ? base.internships : extracted.internships).slice(0, 20),
        education: [],
        skills: [],
        certifications: [],
        achievements: [],
        hobbies: [],
    };
};

const normalizeFeedbackContext = (context = {}) => ({
    jobDescription: normalizeLineBreaks(context.jobDescription || ''),
    atsScore: String(context.atsScore ?? '').trim(),
    matchedKeywords: ensureArrayOfStrings(context.matchedKeywords).slice(0, 40),
    missingKeywords: ensureArrayOfStrings(context.missingKeywords).slice(0, 40),
    missingSkills: normalizeSkills(context.missingSkills),
});

const buildResumeSearchText = (resumeData = {}) => {
    const safeResumeData = ensureObject(resumeData);
    const personalDetails = ensureObject(safeResumeData.personalDetails);
    const workExperience = Array.isArray(safeResumeData.workExperience) ? safeResumeData.workExperience : [];
    const projects = Array.isArray(safeResumeData.projects) ? safeResumeData.projects : [];
    const internships = Array.isArray(safeResumeData.internships) ? safeResumeData.internships : [];
    const education = Array.isArray(safeResumeData.education) ? safeResumeData.education : [];

    const chunks = [
        personalDetails.summary,
        personalDetails.title,
        ...workExperience.map((item) => [item?.company, item?.role, item?.description].filter(Boolean).join(' ')),
        ...projects.map((item) => [item?.name, item?.title, item?.techStack, item?.description].filter(Boolean).join(' ')),
        ...internships.map((item) => [item?.company, item?.role, item?.description].filter(Boolean).join(' ')),
        ...education.map((item) => [item?.institution, item?.degree, item?.description].filter(Boolean).join(' ')),
        ...(Array.isArray(safeResumeData.skills) ? safeResumeData.skills : []),
        ...(Array.isArray(safeResumeData.certifications) ? safeResumeData.certifications : []),
        ...(Array.isArray(safeResumeData.achievements) ? safeResumeData.achievements : []),
        ...(Array.isArray(safeResumeData.hobbies) ? safeResumeData.hobbies : []),
    ];

    return normalizeLineBreaks(chunks.filter(Boolean).join('\n')).toLowerCase();
};

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeSearchText = (value = '') =>
    String(value || '')
        .toLowerCase()
        .replace(/[._/\\-]+/g, ' ')
        .replace(/[^a-z0-9+\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const getSkillSearchVariants = (term = '') => {
    const normalizedTerm = normalizeSkillKey(term);
    const canonical = normalizeSkillKey(normalizeAtsSkillName(term));
    const base = canonical || normalizedTerm;
    const variants = SKILL_MATCH_VARIANTS.get(base) || [base, normalizedTerm];

    return [...new Set(
        variants
            .map((variant) => normalizeSkillKey(variant))
            .filter(Boolean),
    )];
};

const containsTermInResume = (resumeText = '', term = '') => {
    const normalizedText = normalizeSearchText(resumeText);
    const collapsedText = normalizedText.replace(/\s+/g, '');
    const variants = getSkillSearchVariants(term);

    if (!normalizedText || !variants.length) {
        return false;
    }

    return variants.some((variant) => {
        if (!variant) {
            return false;
        }

        const collapsedVariant = variant.replace(/\s+/g, '');
        if (collapsedVariant && collapsedText.includes(collapsedVariant)) {
            return true;
        }

        const escapedVariant = escapeRegExp(variant);
        const matcher = variant.includes(' ')
            ? new RegExp(`(?:^|\\s)${escapedVariant}(?=\\s|$)`, 'i')
            : new RegExp(`\\b${escapedVariant}\\b`, 'i');

        return matcher.test(normalizedText);
    });
};

const filterTermsNotInResume = (termSources = [], resumeText = '', max = 20) =>
    normalizeSkills(...(Array.isArray(termSources) ? termSources : [termSources]))
        .filter((term) => !containsTermInResume(resumeText, term))
        .slice(0, max);

const buildSkillKeySet = (skills = []) =>
    new Set(
        normalizeSkills(skills)
            .map((skill) => toSkillMatchKey(skill))
            .filter(Boolean),
    );

const normalizeResumeImprovePayload = (payload, resumeData = {}, feedbackContext = {}, options = {}) => {
    const safePayload = ensureObject(payload);
    const safeOptions = ensureObject(options);
    const atsOnly = Boolean(safeOptions.atsOnly);
    const safeAtsFeedback = ensureObject(safePayload.atsFeedback);
    const normalizedContext = normalizeFeedbackContext(feedbackContext);
    const resumeSearchText = buildResumeSearchText(resumeData);
    const aiMissingKeywords = filterTermsNotInResume(
        [safeAtsFeedback.missingKeywords, safePayload.missingKeywords, normalizedContext.missingKeywords],
        resumeSearchText,
        25,
    );
    const aiMissingSkills = filterTermsNotInResume(
        [safeAtsFeedback.missingSkills, safePayload.missingSkills, normalizedContext.missingSkills],
        resumeSearchText,
        20,
    );
    const resumeSkillKeySet = buildSkillKeySet(resumeData.skills);
    const optimizedSkillCandidates = normalizeSkills(
        safePayload.skills,
        safeAtsFeedback.missingSkills,
        safePayload.missingSkills,
        normalizedContext.missingSkills,
        aiMissingSkills,
    );
    const optimizedSkills = atsOnly
        ? aiMissingSkills.slice(0, 20)
        : optimizedSkillCandidates
              .filter((skill) => {
                  const key = toSkillMatchKey(skill);
                  return Boolean(key) && !resumeSkillKeySet.has(key);
              })
              .slice(0, 20);
    const whyScoreIsLower = ensureArrayOfStrings(
        safeAtsFeedback.whyScoreIsLower || safeAtsFeedback.scoreGaps || safePayload.whyScoreIsLower,
    ).slice(0, 8);
    const improvementSteps = ensureArrayOfStrings(
        safeAtsFeedback.improvementSteps || safeAtsFeedback.actions || safePayload.improvementSteps,
    ).slice(0, 8);

    if (!whyScoreIsLower.length) {
        if (aiMissingSkills.length) {
            whyScoreIsLower.push('Required technical skills from the job description are missing from resume sections.');
        }
        if (aiMissingKeywords.length) {
            whyScoreIsLower.push('Important job-description keywords are not represented in summary, projects, or experience.');
        }
    }

    if (!improvementSteps.length) {
        if (aiMissingSkills[0]) {
            improvementSteps.push(
                atsOnly
                    ? `Use ${aiMissingSkills[0]} naturally in experience, projects, or internships.`
                    : `Add ${aiMissingSkills[0]} in skills section.`,
            );
        }
        if (aiMissingKeywords[0]) {
            improvementSteps.push(`Use ${aiMissingKeywords[0]} in summary or experience bullet points.`);
        }
        if (aiMissingKeywords[1]) {
            improvementSteps.push(`Include ${aiMissingKeywords[1]} in project descriptions aligned with the target role.`);
        }
    }

    const profession =
        deriveProfessionalTitle(resumeData) ||
        compactToOneLine(resumeData?.personalDetails?.title || '') ||
        'Technology Professional';

    return {
        summary: atsOnly
            ? normalizeAtsOnlySummary(safePayload.summary || resumeData?.personalDetails?.summary || '')
            : normalizeSummary(safePayload.summary, resumeData),
        workExperience: normalizeWorkExperienceSection({
            payloadItems: safePayload.workExperience,
            sourceItems: resumeData.workExperience,
            profession,
            allowSyntheticFallback: false,
        }),
        projects: normalizeProjectsSection({
            payloadItems: safePayload.projects,
            sourceItems: resumeData.projects,
            profession,
            allowSyntheticFallback: false,
        }),
        internships: normalizeInternshipsSection({
            payloadItems: safePayload.internships,
            sourceItems: resumeData.internships,
            profession,
            allowSyntheticFallback: false,
        }),
        skills: optimizedSkills,
        certifications: atsOnly
            ? []
            : Array.isArray(resumeData.certifications) && resumeData.certifications.length
                ? normalizeOneLineList(
                      dedupeLines([...normalizeOneLineList(safePayload.certifications), ...normalizeOneLineList(resumeData.certifications)]),
                      TARGET_SHORT_LIST_ITEMS,
                  )
                : [],
        achievements: atsOnly
            ? []
            : Array.isArray(resumeData.achievements) && resumeData.achievements.length
                ? normalizeOneLineList(
                      dedupeLines([...normalizeOneLineList(safePayload.achievements), ...normalizeOneLineList(resumeData.achievements)]),
                      TARGET_SHORT_LIST_ITEMS,
                  )
                : [],
        hobbies: atsOnly
            ? []
            : Array.isArray(resumeData.hobbies) && resumeData.hobbies.length
                ? normalizeOneLineList(
                      dedupeLines([...normalizeOneLineList(safePayload.hobbies), ...normalizeOneLineList(resumeData.hobbies)]),
                      TARGET_SHORT_LIST_ITEMS,
                  )
                : [],
        atsFeedback: {
            currentScore: String(
                safeAtsFeedback.currentScore ??
                    safePayload.currentScore ??
                    normalizedContext.atsScore ??
                    '',
            ).trim(),
            whyScoreIsLower,
            missingKeywords: aiMissingKeywords,
            missingSkills: aiMissingSkills,
            improvementSteps,
        },
    };
};

const stripMarkdownFences = (text) =>
    String(text || '')
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

const tryParseJson = (text) => {
    try {
        return JSON.parse(text);
    } catch (_error) {
        return null;
    }
};

const extractJsonCandidate = (text) => {
    const cleaned = stripMarkdownFences(text);
    const direct = tryParseJson(cleaned);

    if (direct) {
        return direct;
    }

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
        return null;
    }

    return tryParseJson(cleaned.slice(firstBrace, lastBrace + 1));
};

const LIVE_PREVIEW_SUMMARY_EXTENSION_SENTENCES = [
    'Delivered measurable professional impact through structured execution, accountable collaboration, and consistent business outcomes.',
    'Contributed to integration and iterative enhancement across delivery cycles while maintaining dependable release quality.',
    'Strengthened implementation reliability through documentation discipline, testing consistency, and role-aligned execution ownership.',
];

const normalizeLivePreviewParagraph = (value = '') =>
    compactToOneLine(value)
        .replace(/^[\u2022*-]+\s*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const livePreviewSummaryWordCount = (value = '') => tokenizeWords(value).length;

const trimLivePreviewSummaryToMaxWords = (value = '') => {
    const words = compactToOneLine(value)
        .split(/\s+/)
        .filter(Boolean);
    if (!words.length) {
        return '';
    }

    return ensureSentenceEnding(words.slice(0, LIVE_PREVIEW_SUMMARY_MAX_WORDS).join(' '));
};

const fitLivePreviewSummaryWordRange = (value = '', resumeData = {}) => {
    let summary = normalizeLivePreviewParagraph(value);
    if (!summary) {
        return '';
    }

    let totalWords = livePreviewSummaryWordCount(summary);
    let extensionIndex = 0;
    while (totalWords < LIVE_PREVIEW_SUMMARY_MIN_WORDS && extensionIndex < LIVE_PREVIEW_SUMMARY_EXTENSION_SENTENCES.length) {
        summary = `${summary} ${LIVE_PREVIEW_SUMMARY_EXTENSION_SENTENCES[extensionIndex]}`;
        totalWords = livePreviewSummaryWordCount(summary);
        extensionIndex += 1;
    }

    if (totalWords < LIVE_PREVIEW_SUMMARY_MIN_WORDS) {
        const role = deriveProfessionalTitle(resumeData) || 'Technology Professional';
        summary = `${summary} Delivered sustained value as ${role} through disciplined implementation, collaborative execution, and measurable professional outcomes.`;
        totalWords = livePreviewSummaryWordCount(summary);
    }

    if (totalWords > LIVE_PREVIEW_SUMMARY_MAX_WORDS) {
        return trimLivePreviewSummaryToMaxWords(summary);
    }

    if (totalWords < LIVE_PREVIEW_SUMMARY_TARGET_WORDS) {
        summary = `${summary} Delivered measurable outcomes aligned with product goals and long-term business priorities.`;
    }

    return trimLivePreviewSummaryToMaxWords(summary);
};

const normalizeLivePreviewSummary = (value = '', resumeData = {}) => {
    const normalized = normalizeLineBreaks(value).replace(/^[\u2022*-]+\s*/gm, '').trim();
    if (!normalized) {
        return '';
    }

    const summary = normalizeSummary(normalized, resumeData);
    const primaryContext = resolvePrimarySummaryContext(resumeData);
    const summaryText = compactToOneLine(summary).toLowerCase();

    if (primaryContext === 'workExperience' && /\bintern(ship|ships?)\b/.test(summaryText)) {
        return buildContextDrivenSummary(resumeData);
    }

    if (primaryContext === 'internships' && /\b(work experience|professional experience|employment)\b/.test(summaryText)) {
        return buildContextDrivenSummary(resumeData);
    }

    return summary;
};

const buildLivePreviewSummaryFallback = (resumeData = {}) => {
    return normalizeSummary('', resumeData);
};

const buildSummaryPreviewResponse = (summary = '') => ({
    summary,
    workExperience: [],
    projects: [],
    internships: [],
    skills: [],
    certifications: [],
    achievements: [],
    hobbies: [],
    atsFeedback: {
        currentScore: '',
        whyScoreIsLower: [],
        missingKeywords: [],
        missingSkills: [],
        improvementSteps: [],
    },
});

const buildLivePreviewSummaryPrompt = ({ resumeData }) => {
    const targetRole = deriveProfessionalTitle(resumeData) || compactToOneLine(resumeData?.personalDetails?.title || '') || 'Not specified';
    const primaryContext = resolvePrimarySummaryContext(resumeData);
    const resumeDataPreview = toSafeAiJson(resumeData, 10_000);

    return `You are an elite ATS resume strategist writing a professional summary for resume builder live preview.

SUMMARY RULES (STRICT):
1. Use 4 or 5 lines.
2. Total summary length must be 45 to 47 words.
3. First line must start with candidate job title exactly.
4. Use only job title and real experience, project, or internship context from resumeData.
5. Explicitly show what the candidate delivers or builds.
6. Do NOT use dummy text, filler, or template phrases.
7. Use strong professional vocabulary and meaningful action verbs.
8. Keep each line concise for A4 resume width.
9. End with a complete, grammatically strong professional sentence.
10. Do NOT mention tools/skills unless they already appear in source context text.
11. Context priority rule:
   - If workExperience has data, use work experience context and do not mention internship.
   - If workExperience is empty and internships has data, use internship context and do not mention work experience.
   - If both are empty, do not force either context.
12. Prioritize experience/internship/project evidence over personal profile statements.
13. Personal details are secondary; focus on professional delivery and built outcomes.
14. Prefer ATS-optimized wording that supports 90+ ATS potential when data allows.

OUTPUT RULES:
1. Return valid JSON only.
2. Return exactly this schema:
{
  "summary": "4 or 5 lines, total 45-47 words"
}

Input:
targetRole: ${targetRole}
primaryContext: ${primaryContext || 'none'}
resumeData: ${resumeDataPreview}`;
};

const parseSummaryPreviewResponse = (rawText = '', resumeData = {}) => {
    const parsed = extractJsonCandidate(rawText);
    const candidateSummary =
        typeof parsed === 'string'
            ? parsed
            : typeof parsed?.summary === 'string'
                ? parsed.summary
                : '';
    const normalized = normalizeLivePreviewSummary(candidateSummary, resumeData);
    if (!normalized) {
        throw new AppError('AI response is missing summary.', 502);
    }

    return normalized;
};



const buildResumeImprovePrompt = ({ resumeData, feedbackContext }) => {
    const targetRole = String(resumeData?.personalDetails?.title || '').trim();
    const safeContext = normalizeFeedbackContext(feedbackContext);
    const resumeDataPreview = toSafeAiJson(resumeData, 10_000);
    const jobDescriptionPreview = toSafeAiJson(safeContext.jobDescription, 2_000);
    const atsScorePreview = toSafeAiJson(safeContext.atsScore, 200);
    const matchedKeywordsPreview = toSafeAiJson(safeContext.matchedKeywords, 1_500);
    const missingKeywordsPreview = toSafeAiJson(safeContext.missingKeywords, 1_500);
    const missingSkillsPreview = toSafeAiJson(safeContext.missingSkills, 1_500);

    return `You are an elite ATS resume writer and professional technical resume optimizer.

Your task is to enhance resume content for a resume builder UI rendered directly in A4 templates.

GLOBAL FORMAT RULES:
1. Use powerful, modern, ATS-optimized vocabulary.
2. Do not invent experience.
3. Do not add fake metrics.
4. Use only the data provided.
5. Keep section order exactly the same.
6. Maintain clean and consistent structure for all templates.
7. Return valid JSON only.
8. Target ATS-ready wording quality aligned toward a 90+ score when realistically possible.

SUMMARY RULES (STRICT):
1. Use 4 or 5 lines.
2. Total summary length must be 45 to 47 words.
3. First line must start with candidate job title exactly.
4. Use only job title and real experience, project, or internship context from resumeData.
5. Explicitly show what the candidate delivers or builds.
6. Do NOT use dummy text, filler, or template phrases.
7. Use strong professional vocabulary and meaningful action verbs.
8. Keep each line concise for A4 resume width.
9. End with a complete, grammatically strong professional sentence.
10. Use only facts from provided resumeData fields.
11. Do not reuse canned templates, sample sentences, or fixed phrases.
12. Prioritize experience/internship/project evidence over personal profile statements.
13. Personal details are secondary; focus on what candidate delivers or builds.

BULLET RULES (STRICT):
1. For each work experience, project, and internship item return exactly 3 bullets.
2. Each bullet must contain 7 to 9 words.
3. Each bullet must start with a strong action verb.
4. Keep each bullet line unique and avoid repeated wording across bullets of the same item.
5. Keep each bullet concise and suitable for A4 resume width.
6. Include technology, task, and result naturally without fabrication.

SKILLS RULES:
1. Keep only relevant technical skills missing or weak in the current resume.
2. Use ATS-friendly grouping language.
3. Normalize names: React => ReactJS, Node => NodeJS, Mongo => MongoDB, JS => JavaScript.

ACHIEVEMENTS / CERTIFICATIONS / HOBBIES:
1. Keep each item to one clean professional line with 4 or 5 words.

ADDITIONAL RULES:
1. If an input section is empty, return an empty array for that section.
2. Keep formatting clean, no markdown, no decorative symbols.
3. Generate atsFeedback using resume and job description context.
4. missingKeywords and missingSkills must be practical, absent, or weakly represented.
5. Keep feedback concise and specific.
6. Improve keyword coverage and phrasing to maximize ATS score potential toward 90+.

Input:
resumeData: ${resumeDataPreview}
targetRole: ${targetRole || 'Not specified'}
jobDescription: ${jobDescriptionPreview}
currentAtsScore: ${atsScorePreview}
matchedKeywords: ${matchedKeywordsPreview}
knownMissingKeywords: ${missingKeywordsPreview}
knownMissingSkills: ${missingSkillsPreview}

Return JSON in this exact schema:
{
  "summary": "4 or 5 lines with total 45-47 words",
  "workExperience": [
    {
      "company": "string",
      "role": "string",
      "bullets": ["7 to 9 words"]
    }
  ],
  "projects": [
    {
      "title": "string",
      "bullets": ["7 to 9 words"]
    }
  ],
  "internships": [
    {
      "company": "string",
      "bullets": ["7 to 9 words"]
    }
  ],
  "skills": ["string"],
  "certifications": ["string"],
  "achievements": ["string"],
  "hobbies": ["string"],
  "atsFeedback": {
    "currentScore": "string",
    "whyScoreIsLower": ["string"],
    "missingKeywords": ["string"],
    "missingSkills": ["string"],
    "improvementSteps": ["string"]
  }
}`;
};

const buildAtsOnlyResumeImprovePrompt = ({ resumeData, resumeText = '', feedbackContext }) => {
    const safeContext = normalizeFeedbackContext(feedbackContext);
    const resumeDataPreview = toSafeAiJson(resumeData, 8_000);
    const resumeTextPreview = toSafeAiJson(truncateText(resumeText, 8_000), 8_300);
    const jobDescriptionPreview = toSafeAiJson(safeContext.jobDescription, 2_000);
    const atsScorePreview = toSafeAiJson(safeContext.atsScore, 200);
    const matchedKeywordsPreview = toSafeAiJson(safeContext.matchedKeywords, 1_200);
    const missingKeywordsPreview = toSafeAiJson(safeContext.missingKeywords, 1_200);
    const missingSkillsPreview = toSafeAiJson(safeContext.missingSkills, 1_200);

    return `You are an ATS resume optimizer focused only on wording improvements.

Scope:
1. Improve only these sections: summary, workExperience, projects, internships.
2. Use only content already present in uploaded resume text/data.
3. Do not invent employers, projects, dates, tools, or metrics.
4. Keep wording ATS-friendly and concise.
5. Also return skills as missing/recommended skills based on job description and ATS context.
6. If a section does not exist, return empty string/array for that section.
7. Return valid JSON only.
8. Optimize wording and keyword coverage for 90+ ATS potential where the source data supports it.

Input:
resumeData: ${resumeDataPreview}
uploadedResumeText: ${resumeTextPreview}
jobDescription: ${jobDescriptionPreview}
currentAtsScore: ${atsScorePreview}
matchedKeywords: ${matchedKeywordsPreview}
knownMissingKeywords: ${missingKeywordsPreview}
knownMissingSkills: ${missingSkillsPreview}

Return JSON in this exact schema:
{
  "summary": "string",
  "workExperience": [
    {
      "company": "string",
      "role": "string",
      "bullets": ["string"]
    }
  ],
  "projects": [
    {
      "title": "string",
      "bullets": ["string"]
    }
  ],
  "internships": [
    {
      "company": "string",
      "role": "string",
      "bullets": ["string"]
    }
  ],
  "skills": ["string"],
  "atsFeedback": {
    "currentScore": "string",
    "whyScoreIsLower": ["string"],
    "missingKeywords": ["string"],
    "missingSkills": ["string"],
    "improvementSteps": ["string"]
  }
}`;
};

const parseAIJsonResponse = (rawText, resumeData = {}, feedbackContext = {}, options = {}) => {
    const safeOptions = ensureObject(options);
    const atsOnly = Boolean(safeOptions.atsOnly);
    const parsed = extractJsonCandidate(rawText);

    if (!parsed) {
        throw new AppError('Unable to parse JSON from AI response.', 502, {
            rawPreview: String(rawText || '').slice(0, 600),
        });
    }

    const normalized = normalizeResumeImprovePayload(parsed, resumeData, feedbackContext, { atsOnly });

    if (!atsOnly && !normalized.summary) {
        throw new AppError('AI response is missing summary.', 502);
    }

    return normalized;
};

const buildFallbackSummary = (resumeData = {}, options = {}) => {
    const safeOptions = ensureObject(options);
    const atsOnly = Boolean(safeOptions.atsOnly);
    const summary = atsOnly
        ? normalizeAtsOnlySummary(resumeData?.personalDetails?.summary || '')
        : normalizeSummary(resumeData?.personalDetails?.summary || '', resumeData);
    if (summary) {
        return summary;
    }

    if (atsOnly) {
        return '';
    }

    const generatedLines = buildSummaryGeneratorLines(resumeData);
    if (!generatedLines.length) {
        return '';
    }

    return fillToFixedLineCount(generatedLines, TARGET_SUMMARY_LINES, generatedLines, {
        allowVerbRewrites: false,
    }).join('\n');
};

const buildFallbackPayload = ({ resumeData = {}, feedbackContext = {}, mode = IMPROVEMENT_MODES.FULL }) => {
    const normalizedMode = normalizeImprovementMode(mode);
    const atsOnly = isAtsOnlyMode(normalizedMode);
    const safeContext = normalizeFeedbackContext(feedbackContext);
    const resumeSearchText = buildResumeSearchText(resumeData);
    const missingKeywords = filterTermsNotInResume([safeContext.missingKeywords], resumeSearchText, 25);
    const missingSkills = filterTermsNotInResume([safeContext.missingSkills], resumeSearchText, 20);
    const profession = deriveProfessionalTitle(resumeData);

    const whyScoreIsLower = [];
    if (missingKeywords.length) {
        whyScoreIsLower.push('Important target keywords are underrepresented in summary and experience content.');
    }
    if (missingSkills.length) {
        whyScoreIsLower.push(
            atsOnly
                ? 'Important technical skills are not sufficiently represented in summary, experience, projects, or internships.'
                : 'Some required technical skills are missing in the dedicated skills section.',
        );
    }
    if (!whyScoreIsLower.length) {
        whyScoreIsLower.push('Bullet points can be more outcome-focused and ATS-aligned.');
    }

    const improvementSteps = atsOnly
        ? [
              'Add missing keywords naturally in summary, experience, projects, and internship bullets.',
              'Strengthen action-oriented wording in existing experience, project, and internship lines.',
              'Map job-description technical terms directly into relevant experience or project outcomes.',
          ]
        : [
              'Add missing keywords naturally in summary, experience, and project bullets.',
              'Use action-first bullet points and include measurable outcomes where available.',
              'Align skills section terms with tools and technologies already used in your work history.',
          ];

    return {
        summary: buildFallbackSummary(resumeData, { atsOnly }),
        workExperience: (Array.isArray(resumeData.workExperience) ? resumeData.workExperience : []).map((item) => ({
            company: String(item?.company || '').trim(),
            role: String(item?.role || '').trim(),
            bullets: normalizeBulletList({
                text: item?.description || '',
                fallbackText: item?.description || '',
                allowSyntheticFallback: false,
                contextLabel: buildSectionContextLabel({
                    profession,
                    sectionLabel: 'work experience',
                    primaryLabel: item?.role || '',
                    secondaryLabel: item?.company || '',
                }),
            }),
        })),
        projects: (Array.isArray(resumeData.projects) ? resumeData.projects : []).map((item) => ({
            title: String(item?.name || item?.title || '').trim(),
            bullets: normalizeBulletList({
                text: item?.description || '',
                fallbackText: item?.description || '',
                allowSyntheticFallback: false,
                contextLabel: buildSectionContextLabel({
                    profession,
                    sectionLabel: 'project',
                    primaryLabel: item?.name || item?.title || 'delivery',
                    secondaryLabel: item?.techStack || '',
                }),
            }),
        })),
        internships: (Array.isArray(resumeData.internships) ? resumeData.internships : []).map((item) => ({
            company: String(item?.company || '').trim(),
            role: String(item?.role || '').trim(),
            bullets: normalizeBulletList({
                text: item?.description || '',
                fallbackText: item?.description || '',
                allowSyntheticFallback: false,
                contextLabel: buildSectionContextLabel({
                    profession,
                    sectionLabel: 'internship',
                    primaryLabel: item?.role || '',
                    secondaryLabel: item?.company || '',
                }),
            }),
        })),
        skills: atsOnly ? missingSkills.slice(0, 20) : normalizeSkills(resumeData.skills),
        certifications: atsOnly ? [] : normalizeOneLineList(resumeData.certifications, TARGET_SHORT_LIST_ITEMS),
        achievements: atsOnly ? [] : normalizeOneLineList(resumeData.achievements, TARGET_SHORT_LIST_ITEMS),
        hobbies: atsOnly ? [] : normalizeOneLineList(resumeData.hobbies, TARGET_SHORT_LIST_ITEMS),
        atsFeedback: {
            currentScore: String(safeContext.atsScore || '').trim(),
            whyScoreIsLower,
            missingKeywords,
            missingSkills,
            improvementSteps,
        },
    };
};

const improveResumeWithAI = async ({
    mode = IMPROVEMENT_MODES.FULL,
    resumeData,
    resumeText = '',
    jobDescription = '',
    atsScore = '',
    matchedKeywords = [],
    missingKeywords = [],
    missingSkills = [],
}) => {
    const normalizedMode = normalizeImprovementMode(mode);
    const atsOnly = isAtsOnlyMode(normalizedMode);
    const summaryPreview = isSummaryPreviewMode(normalizedMode);
    const normalizedResumeData = atsOnly
        ? buildAtsOnlyResumeData({
              resumeData,
              resumeText,
          })
        : sanitizeResumeDataForPrompt(resumeData);

    const feedbackContext = normalizeFeedbackContext({
        jobDescription,
        atsScore,
        matchedKeywords,
        missingKeywords,
        missingSkills,
    });

    if (summaryPreview) {
        const prompt = buildLivePreviewSummaryPrompt({
            resumeData: normalizedResumeData,
        });

        try {
            const responseText = await requestChatCompletion({
                messages: [{ role: 'user', content: prompt }],
                jsonMode: true,
                expectJson: true,
                maxTokens: 500,
            });

            const summary = parseSummaryPreviewResponse(responseText, normalizedResumeData);
            return buildSummaryPreviewResponse(summary);
        } catch (_error) {
            return buildSummaryPreviewResponse(buildLivePreviewSummaryFallback(normalizedResumeData));
        }
    }

    const prompt = atsOnly
        ? buildAtsOnlyResumeImprovePrompt({
              resumeData: normalizedResumeData,
              resumeText,
              feedbackContext,
          })
        : buildResumeImprovePrompt({
              resumeData: normalizedResumeData,
              feedbackContext,
          });

    try {
        const responseText = await requestChatCompletion({
            messages: [{ role: 'user', content: prompt }],
            jsonMode: true,
            expectJson: true,
            maxTokens: 1500,
        });

        return parseAIJsonResponse(
            responseText,
            normalizedResumeData,
            feedbackContext,
            { atsOnly },
        );
    } catch (_error) {
        return normalizeResumeImprovePayload(
            buildFallbackPayload({
                resumeData: normalizedResumeData,
                feedbackContext,
                mode: normalizedMode,
            }),
            normalizedResumeData,
            feedbackContext,
            { atsOnly },
        );
    }
};
module.exports = {
    improveResumeWithAI,
    generateAiImprovements: improveResumeWithAI,
};
