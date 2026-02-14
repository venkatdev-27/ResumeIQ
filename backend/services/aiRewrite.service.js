const { AppError } = require('../utils/response');
const { requestChatCompletion } = require('./aiClient.service');

const MAX_AI_PAYLOAD_CHARS = 12_000;
const TARGET_SUMMARY_LINES = 4;
const TARGET_SUMMARY_MIN_WORDS = 45;
const TARGET_SUMMARY_MAX_WORDS = 47;
const TARGET_SUMMARY_WORDS = 46;

const TARGET_BULLET_LINES = 3;
const TARGET_BULLET_WORDS = 14;
const TARGET_SHORT_LIST_ITEMS = 20;
const ACTION_VERBS = ['Delivered', 'Engineered', 'Implemented', 'Optimized', 'Architected', 'Streamlined', 'Automated', 'Integrated', 'Developed', 'Deployed', 'Enhanced'];
const SUMMARY_FALLBACK_TOKENS = [
    'enterprise',
    'platforms',
    'automation',
    'scalability',
    'reliability',
    'optimization',
    'delivery',
    'architecture',
    'quality',
    'collaboration',
];
const DEFAULT_PROFESSIONAL_SUMMARY_LINES = [
    'Technology professional delivering reliable software solutions through hands-on, collaborative development and improvement.',
    'Uses modern workflows to build features, resolve issues, and improve outcomes.',
    'Contributes across projects with documentation, testing discipline, and ownership of deliverables.',
    'Focused on scalable architecture, maintainability, and learning aligned with long-term business goals.',
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
]);

const normalizeSkillKey = (value = '') =>
    compactToOneLine(value)
        .toLowerCase()
        .replace(/[._/\\-]+/g, ' ')
        .replace(/[^a-z0-9+\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

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
    const merged = sources.flatMap((source) => ensureArrayOfStrings(source));

    return merged
        .map((skill) => normalizeAtsSkillName(skill))
        .filter((skill) => {
            const key = String(skill || '').trim().toLowerCase();
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

    const sources = [
        personal.title,
        ...ensureArrayOfStrings(safeResumeData.skills),
        ...((Array.isArray(safeResumeData.workExperience) ? safeResumeData.workExperience : []).flatMap((item) => [item?.role, item?.company])),
        ...((Array.isArray(safeResumeData.projects) ? safeResumeData.projects : []).flatMap((item) => [item?.name, item?.techStack])),
        ...((Array.isArray(safeResumeData.internships) ? safeResumeData.internships : []).flatMap((item) => [item?.role, item?.company])),
    ];

    return dedupeTokensCaseInsensitive(
        sources
            .flatMap((value) => tokenizeWords(value))
            .filter((token) => token.length > 2),
    );
};

const buildDefaultProfessionalSummary = () =>
    DEFAULT_PROFESSIONAL_SUMMARY_LINES.join('\n');

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
    } = ensureObject(options);

    const seeded = fillToFixedLineCount(lines, TARGET_SUMMARY_LINES, DEFAULT_PROFESSIONAL_SUMMARY_LINES, {
        allowVerbRewrites: false,
    }).map((line) => ensureSentenceEnding(line));

    const tuningPool = [...SUMMARY_FALLBACK_TOKENS, 'alignment', 'execution', 'impact', 'outcomes', 'value'];
    let tuningCursor = 0;
    let totalWords = summaryWordCount(seeded.join(' '));

    while (totalWords < minWords) {
        const token = tuningPool[tuningCursor % tuningPool.length];
        tuningCursor += 1;
        seeded[TARGET_SUMMARY_LINES - 1] = appendWordToSentence(seeded[TARGET_SUMMARY_LINES - 1], token);
        totalWords = summaryWordCount(seeded.join(' '));
    }

    const trimOrder = [3, 2, 0, 1];
    while (totalWords > maxWords) {
        const before = totalWords;
        for (const lineIndex of trimOrder) {
            const currentLineWords = summaryWordCount(seeded[lineIndex]);
            if (currentLineWords <= 8) {
                continue;
            }
            seeded[lineIndex] = trimSentenceByOneWord(seeded[lineIndex], 8);
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
        return DEFAULT_PROFESSIONAL_SUMMARY_LINES;
    }

    // Keep centered around the preferred target when possible.
    while (totalWords < targetWords && totalWords < maxWords) {
        const token = tuningPool[tuningCursor % tuningPool.length];
        tuningCursor += 1;
        seeded[TARGET_SUMMARY_LINES - 1] = appendWordToSentence(seeded[TARGET_SUMMARY_LINES - 1], token);
        totalWords = summaryWordCount(seeded.join(' '));
    }

    return seeded.slice(0, TARGET_SUMMARY_LINES).map((line) => ensureSentenceEnding(line));
};

const buildContextDrivenSummary = (resumeData = {}) => {
    const title = pickLabelTokens(deriveProfessionalTitle(resumeData), 2).join(' ') || 'Technology Professional';
    const summarySkills = normalizeSkills(resumeData?.skills).slice(0, 4);
    const workLabel = toDisplayList(extractWorkLabels(resumeData), 1);
    const internshipLabel = toDisplayList(extractInternshipLabels(resumeData), 1);
    const projectLabel = toDisplayList(extractProjectLabels(resumeData), 1);
    const hasContextData =
        Boolean(compactToOneLine(resumeData?.personalDetails?.title || '')) ||
        summarySkills.length > 0 ||
        hasText(workLabel) ||
        hasText(internshipLabel) ||
        hasText(projectLabel);

    if (!hasContextData) {
        return buildDefaultProfessionalSummary();
    }

    const lines = [];
    lines.push(`${title} delivering scalable software solutions through disciplined execution and business value.`);

    if (summarySkills.length) {
        lines.push(`Core skills include ${summarySkills.join(', ')}, enabling maintainable architecture and efficient delivery.`);
    } else {
        lines.push('Core capabilities include maintainable architecture, reliable integration patterns, testing rigor, and quality-focused delivery.');
    }

    if (workLabel) {
        lines.push(`Experience includes ${workLabel}, leading implementation, testing, integration, and continuous optimization.`);
    } else if (internshipLabel) {
        lines.push(`Internship exposure includes ${internshipLabel}, supporting implementation, testing, collaboration, and dependable execution.`);
    } else {
        lines.push('Experience demonstrates implementation ownership, structured problem-solving, documentation quality, and measurable delivery consistency.');
    }

    if (projectLabel) {
        lines.push(`Projects include ${projectLabel}, demonstrating ownership, communication, adaptability, and dependable stakeholder alignment.`);
    } else {
        lines.push('Projects and internships demonstrate ownership, communication, adaptability, and dependable stakeholder alignment.');
    }

    return fitSummaryLinesToWordRange(lines).join('\n');
};

const enforceSummaryFormat = (lines = [], resumeData = {}) => {
    const normalizedLines = fillToFixedLineCount(lines, TARGET_SUMMARY_LINES, buildSummaryGeneratorLines(resumeData), {
        allowVerbRewrites: false,
    });

    const normalizedLineTokens = normalizedLines.map((line) => tokenizeWords(line));
    const contextTokens = buildSummaryContextTokens(resumeData);
    const fallbackTokens = SUMMARY_FALLBACK_TOKENS;
    const hasBaseTokens = normalizedLineTokens.some((tokens) => tokens.length > 0);

    if (!hasBaseTokens && !contextTokens.length) {
        return buildDefaultProfessionalSummary();
    }

    let targetWords = TARGET_SUMMARY_WORDS;
    if (targetWords < TARGET_SUMMARY_MIN_WORDS) {
        targetWords = TARGET_SUMMARY_MIN_WORDS;
    }
    if (targetWords > TARGET_SUMMARY_MAX_WORDS) {
        targetWords = TARGET_SUMMARY_MAX_WORDS;
    }

    const lineDistribution = distributeWordsAcrossLines(targetWords, TARGET_SUMMARY_LINES);
    const tokenPool = dedupeTokensCaseInsensitive([
        ...contextTokens,
        ...fallbackTokens,
        ...tokenizeWords(buildDefaultProfessionalSummary()),
    ]);
    let poolCursor = 0;

    const nextPoolToken = () => {
        while (poolCursor < tokenPool.length) {
            const token = String(tokenPool[poolCursor] || '').trim();
            poolCursor += 1;
            if (token) {
                return token;
            }
        }
        return 'delivery';
    };

    const renderedLines = [];
    for (let index = 0; index < TARGET_SUMMARY_LINES; index += 1) {
        const wordCount = lineDistribution[index] || 0;
        const baseTokensForLine = [...(normalizedLineTokens[index] || [])].slice(0, wordCount);

        while (baseTokensForLine.length < wordCount) {
            baseTokensForLine.push(nextPoolToken());
        }

        renderedLines.push(ensureSentenceEnding(baseTokensForLine.join(' ').trim()));
    }

    return renderedLines.slice(0, TARGET_SUMMARY_LINES).join('\n');
};

const enforceBulletWordCount = (line = '', options = {}) => {
    const { contextLabel = '', sourceText = '', bulletIndex = 0, usedWordKeys = new Set() } = ensureObject(options);
    const baseText = compactToOneLine(line) || compactToOneLine(sourceText);
    const baseTokens = tokenizeWords(baseText);
    const contextTokens = dedupeTokensCaseInsensitive(
        tokenizeWords([contextLabel, sourceText].filter(Boolean).join(' '))
            .filter((token) => token.length > 2),
    );
    const tokenPools = [
        baseTokens,
        contextTokens,
        BULLET_PROFESSIONAL_VOCABULARY,
        BULLET_FALLBACK_TOKENS,
    ];

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

    tokenPools.forEach((pool) => {
        if (result.length >= TARGET_BULLET_WORDS) {
            return;
        }
        pool.forEach((token) => {
            if (result.length >= TARGET_BULLET_WORDS) {
                return;
            }
            pushUniqueBulletToken({
                token,
                result,
                lineWordKeys,
                usedWordKeys,
                avoidUsedWords: true,
            });
        });
    });

    tokenPools.forEach((pool) => {
        if (result.length >= TARGET_BULLET_WORDS) {
            return;
        }
        pool.forEach((token) => {
            if (result.length >= TARGET_BULLET_WORDS) {
                return;
            }
            pushUniqueBulletToken({
                token,
                result,
                lineWordKeys,
                usedWordKeys,
                avoidUsedWords: false,
            });
        });
    });

    let fillerCursor = Number(bulletIndex || 0);
    while (result.length < TARGET_BULLET_WORDS) {
        const fallbackToken = BULLET_PROFESSIONAL_VOCABULARY[fillerCursor % BULLET_PROFESSIONAL_VOCABULARY.length] || 'delivery';
        fillerCursor += 1;
        const appended = pushUniqueBulletToken({
            token: fallbackToken,
            result,
            lineWordKeys,
            usedWordKeys,
            avoidUsedWords: false,
        });

        if (!appended) {
            BULLET_ENDING_TOKENS.some((token) =>
                pushUniqueBulletToken({
                    token,
                    result,
                    lineWordKeys,
                    usedWordKeys,
                    avoidUsedWords: false,
                }),
            );
        }
    }

    const finalTokens = result.slice(0, TARGET_BULLET_WORDS);
    const finalWordKeys = new Set(finalTokens.map((token) => toWordKey(token)).filter(Boolean));
    const endingToken = pickEndingToken(finalWordKeys, usedWordKeys);
    if (endingToken) {
        finalTokens[TARGET_BULLET_WORDS - 1] = endingToken;
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
    if (lines.length !== TARGET_SUMMARY_LINES) {
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
    const sourceTexts = [
        personalSummary,
        ...getEntryDescriptions(resumeData?.workExperience),
        ...getEntryDescriptions(resumeData?.projects),
        ...getEntryDescriptions(resumeData?.internships),
    ];

    const lines = sourceTexts.flatMap((text) => {
        const lineTokens = normalizeToLines(text);
        if (lineTokens.length > 1) {
            return lineTokens;
        }
        return normalizeToSentences(text);
    });

    return dedupeLines(lines).slice(0, 4);
};

const ensureSentenceEnding = (value = '') => {
    const line = compactToOneLine(value);
    if (!line) {
        return '';
    }

    return /[.!?]$/.test(line) ? line : `${line}.`;
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
            /^(delivered|engineered|implemented|optimized|architected|streamlined|automated|integrated|developed|deployed|enhanced)\s+/i,
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

    return 'Technology Professional';
};

const buildSummaryGeneratorLines = (resumeData = {}) => {
    const title = deriveProfessionalTitle(resumeData);
    const skills = normalizeSkills(resumeData?.skills).slice(0, 6);
    const workLabels = extractWorkLabels(resumeData);
    const projectLabels = extractProjectLabels(resumeData);
    const internshipLabels = extractInternshipLabels(resumeData);
    const certifications = normalizeOneLineList(resumeData?.certifications).slice(0, 4);
    const achievements = normalizeOneLineList(resumeData?.achievements).slice(0, 3);
    const workText = toDisplayList(workLabels, 2);
    const projectText = toDisplayList(projectLabels, 2);
    const internshipText = toDisplayList(internshipLabels, 2);

    const generated = [];

    generated.push(`${title} focused on delivering reliable and scalable software solutions through disciplined engineering execution.`);

    if (skills.length) {
        generated.push(`Core technical strengths include ${skills.join(', ')}, applied to maintainable architecture and quality-focused implementation.`);
    } else {
        generated.push('Core strengths include modern engineering workflows, code quality standards, testing discipline, and dependable delivery practices.');
    }

    if (workText) {
        generated.push(`Professional experience includes ${workText}, driving feature implementation, integrations, and continuous improvement.`);
    } else if (internshipText) {
        generated.push(`Internship experience includes ${internshipText}, supporting implementation, testing, collaboration, and production readiness.`);
    } else if (projectText) {
        generated.push(`Project experience includes ${projectText}, translating requirements into stable and maintainable software outcomes.`);
    }

    if (projectText) {
        generated.push(`Project contributions include ${projectText}, demonstrating ownership, problem resolution, documentation, and iterative optimization.`);
    } else {
        generated.push('Committed to continuous learning, collaborative delivery, and measurable value aligned with target role expectations.');
    }

    if (certifications.length) {
        generated.push(`Certifications include ${certifications.join(', ')}, reinforcing relevant technical depth and professional standards.`);
    }

    if (achievements.length) {
        generated.push(`Achievements include ${achievements.join(', ')}, reflecting consistent outcomes and accountable execution.`);
    }

    return dedupeLines(generated.map((line) => ensureSentenceEnding(line)).filter(Boolean));
};

const fillToFixedLineCount = (lines = [], target = 4, fallbackLines = [], options = {}) => {
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
            .slice(0, TARGET_SUMMARY_LINES)
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
        TARGET_SUMMARY_LINES,
        [...fallbackLines, ...generatedLines],
        { allowVerbRewrites: false },
    );

    return enforceSummaryFormat(finalLines, resumeData);
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
                sourceText: [sourceText, baseLine, BULLET_PROFESSIONAL_VOCABULARY[index + retryCount] || 'delivery'].join(' '),
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

const normalizeBulletList = ({ bullets = [], text = '', fallbackText = '', contextLabel = '' }) => {
    const fromArray = ensureArrayOfStrings(bullets).map((item) => normalizeBulletItem(item)).filter(Boolean);
    const fromText = toCandidateDescriptionLines(text);
    const fallbackLines = toCandidateDescriptionLines(fallbackText);
    const normalizedContextLabel = compactToOneLine(contextLabel || '');
    const normalizedSourceText = [text, fallbackText, normalizedContextLabel].filter(Boolean).join(' ');

    let mergedLines = dedupeLines([...fromArray, ...fromText, ...fallbackLines]).slice(0, TARGET_BULLET_LINES);

    if (mergedLines.length < TARGET_BULLET_LINES) {
        const expandedLines = expandDescriptionLines([...fromText, ...fallbackLines]);
        mergedLines = dedupeLines([...mergedLines, ...expandedLines]).slice(0, TARGET_BULLET_LINES);
    }

    if (mergedLines.length < TARGET_BULLET_LINES) {
        const generated = buildContextFallbackBullets(contextLabel);
        mergedLines = dedupeLines([...mergedLines, ...generated]).slice(0, TARGET_BULLET_LINES);
    }

    const fixedLines = fillToFixedLineCount(mergedLines, TARGET_BULLET_LINES, buildContextFallbackBullets(contextLabel), {
        allowVerbRewrites: true,
    });

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

const normalizeWorkExperienceSection = ({ payloadItems, sourceItems, profession = '' }) => {
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

const normalizeProjectsSection = ({ payloadItems, sourceItems, profession = '' }) => {
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

const normalizeInternshipsSection = ({ payloadItems, sourceItems, profession = '' }) => {
    const safePayloadItems = Array.isArray(payloadItems) ? payloadItems : [];
    const safeSourceItems = Array.isArray(sourceItems) ? sourceItems : [];
    const effectiveProfession = compactToOneLine(profession) || deriveProfessionFromSourceItems(safeSourceItems);

    return safeSourceItems
        .slice(0, 30)
        .map((sourceItem, index) => {
            const safePayload = ensureObject(safePayloadItems[index]);

            return {
                company: String(safePayload.company || sourceItem.company || '').trim(),
                bullets: normalizeBulletList({
                    bullets: safePayload.bullets,
                    text: safePayload.improvedDescription || safePayload.description || '',
                    fallbackText: sourceItem.description || '',
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

const containsTermInResume = (resumeText = '', term = '') => {
    const normalizedText = String(resumeText || '').toLowerCase();
    const normalizedTerm = String(term || '').toLowerCase().trim();

    if (!normalizedText || !normalizedTerm) {
        return false;
    }

    if (normalizedTerm.includes(' ')) {
        return normalizedText.includes(normalizedTerm);
    }

    return new RegExp(`\\b${escapeRegExp(normalizedTerm)}\\b`, 'i').test(normalizedText);
};

const filterTermsNotInResume = (termSources = [], resumeText = '', max = 20) =>
    normalizeSkills(...(Array.isArray(termSources) ? termSources : [termSources]))
        .filter((term) => !containsTermInResume(resumeText, term))
        .slice(0, max);

const normalizeResumeImprovePayload = (payload, resumeData = {}, feedbackContext = {}) => {
    const safePayload = ensureObject(payload);
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
            improvementSteps.push(`Add ${aiMissingSkills[0]} in skills section.`);
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
        summary: normalizeSummary(safePayload.summary, resumeData),
        workExperience: normalizeWorkExperienceSection({
            payloadItems: safePayload.workExperience,
            sourceItems: resumeData.workExperience,
            profession,
        }),
        projects: normalizeProjectsSection({
            payloadItems: safePayload.projects,
            sourceItems: resumeData.projects,
            profession,
        }),
        internships: normalizeInternshipsSection({
            payloadItems: safePayload.internships,
            sourceItems: resumeData.internships,
            profession,
        }),
        skills: Array.isArray(resumeData.skills) && resumeData.skills.length ? normalizeSkills(safePayload.skills, resumeData.skills) : [],
        certifications:
            Array.isArray(resumeData.certifications) && resumeData.certifications.length
                ? normalizeOneLineList(
                      dedupeLines([...normalizeOneLineList(safePayload.certifications), ...normalizeOneLineList(resumeData.certifications)]),
                      TARGET_SHORT_LIST_ITEMS,
                  )
                : [],
        achievements:
            Array.isArray(resumeData.achievements) && resumeData.achievements.length
                ? normalizeOneLineList(
                      dedupeLines([...normalizeOneLineList(safePayload.achievements), ...normalizeOneLineList(resumeData.achievements)]),
                      TARGET_SHORT_LIST_ITEMS,
                  )
                : [],
        hobbies:
            Array.isArray(resumeData.hobbies) && resumeData.hobbies.length
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

SUMMARY RULES (STRICT):
1. Exactly 4 lines.
2. Total summary length must be 45 to 47 words.
3. Use job title, skills, projects, internships, and experience context.
4. Keep tone impactful and ATS-optimized with no keyword stuffing.
5. Keep lines compact for A4 width.

BULLET RULES (STRICT):
1. For each work experience, project, and internship item return exactly 3 bullets.
2. Each bullet must contain exactly 14 words.
3. Each bullet must start with a strong action verb.
4. Keep each bullet line unique and avoid repeated wording across bullets of the same item.
5. Keep each bullet compact for single-line A4 rendering with clean grammar and professional vocabulary.
6. Include technology, task, and result naturally without fabrication.

SKILLS RULES:
1. Keep only relevant technical skills.
2. Use ATS-friendly grouping language.
3. Normalize names: React => ReactJS, Node => NodeJS, Mongo => MongoDB, JS => JavaScript.

ACHIEVEMENTS / CERTIFICATIONS / HOBBIES:
1. Keep each item to one clean professional line.

ADDITIONAL RULES:
1. If an input section is empty, return an empty array for that section.
2. Keep formatting clean, no markdown, no decorative symbols.
3. Generate atsFeedback using resume and job description context.
4. missingKeywords and missingSkills must be practical, absent, or weakly represented.
5. Keep feedback concise and specific.

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
  "summary": "4 lines only with total 45-47 words",
  "workExperience": [
    {
      "company": "string",
      "role": "string",
      "bullets": ["14 words exactly"]
    }
  ],
  "projects": [
    {
      "title": "string",
      "bullets": ["14 words exactly"]
    }
  ],
  "internships": [
    {
      "company": "string",
      "bullets": ["14 words exactly"]
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

const parseAIJsonResponse = (rawText, resumeData = {}, feedbackContext = {}) => {
    const parsed = extractJsonCandidate(rawText);

    if (!parsed) {
        throw new AppError('Unable to parse JSON from AI response.', 502, {
            rawPreview: String(rawText || '').slice(0, 600),
        });
    }

    const normalized = normalizeResumeImprovePayload(parsed, resumeData, feedbackContext);

    if (!normalized.summary) {
        throw new AppError('AI response is missing summary.', 502);
    }

    return normalized;
};

const buildFallbackSummary = (resumeData = {}) => {
    const summary = normalizeSummary(resumeData?.personalDetails?.summary || '', resumeData);
    if (summary) {
        return summary;
    }

    const generatedLines = buildSummaryGeneratorLines(resumeData);
    if (!generatedLines.length) {
        return '';
    }

    return fillToFixedLineCount(generatedLines, TARGET_SUMMARY_LINES, generatedLines, {
        allowVerbRewrites: false,
    }).join('\n');
};

const buildFallbackPayload = ({ resumeData = {}, feedbackContext = {} }) => {
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
        whyScoreIsLower.push('Some required technical skills are missing in the dedicated skills section.');
    }
    if (!whyScoreIsLower.length) {
        whyScoreIsLower.push('Bullet points can be more outcome-focused and ATS-aligned.');
    }

    const improvementSteps = [
        'Add missing keywords naturally in summary, experience, and project bullets.',
        'Use action-first bullet points and include measurable outcomes where available.',
        'Align skills section terms with tools and technologies already used in your work history.',
    ];

    return {
        summary: buildFallbackSummary(resumeData),
        workExperience: (Array.isArray(resumeData.workExperience) ? resumeData.workExperience : []).map((item) => ({
            company: String(item?.company || '').trim(),
            role: String(item?.role || '').trim(),
            bullets: normalizeBulletList({
                text: item?.description || '',
                fallbackText: item?.description || '',
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
            bullets: normalizeBulletList({
                text: item?.description || '',
                fallbackText: item?.description || '',
                contextLabel: buildSectionContextLabel({
                    profession,
                    sectionLabel: 'internship',
                    primaryLabel: item?.role || '',
                    secondaryLabel: item?.company || '',
                }),
            }),
        })),
        skills: normalizeSkills(resumeData.skills),
        certifications: normalizeOneLineList(resumeData.certifications, TARGET_SHORT_LIST_ITEMS),
        achievements: normalizeOneLineList(resumeData.achievements, TARGET_SHORT_LIST_ITEMS),
        hobbies: normalizeOneLineList(resumeData.hobbies, TARGET_SHORT_LIST_ITEMS),
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
    resumeData,
    jobDescription = '',
    atsScore = '',
    matchedKeywords = [],
    missingKeywords = [],
    missingSkills = [],
}) => {

    const normalizedResumeData = sanitizeResumeDataForPrompt(resumeData);

    const feedbackContext = normalizeFeedbackContext({
        jobDescription,
        atsScore,
        matchedKeywords,
        missingKeywords,
        missingSkills,
    });

    const prompt = buildResumeImprovePrompt({
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
        );
    } catch (_error) {
        return normalizeResumeImprovePayload(
            buildFallbackPayload({
                resumeData: normalizedResumeData,
                feedbackContext,
            }),
            normalizedResumeData,
            feedbackContext,
        );
    }
};
module.exports = {
    improveResumeWithAI,
    generateAiImprovements: improveResumeWithAI,
};
