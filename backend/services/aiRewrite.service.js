const { AppError } = require('../utils/response');
const { requestChatCompletion } = require('./aiClient.service');

const MAX_AI_PAYLOAD_CHARS = 12_000;
const TARGET_SUMMARY_LINES = 4;

const TARGET_BULLET_LINES = 3;
const TARGET_SHORT_LIST_ITEMS = 20;
const ACTION_VERBS = ['Delivered', 'Engineered', 'Implemented', 'Optimized', 'Architected', 'Streamlined', 'Automated', 'Integrated', 'Developed', 'Deployed', 'Enhanced'];

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

const normalizeSkills = (...sources) => {
    const seen = new Set();
    const merged = sources.flatMap((source) => ensureArrayOfStrings(source));

    return merged
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

const buildSummaryGeneratorLines = (resumeData = {}) => {
    const title = compactToOneLine(resumeData?.personalDetails?.title || '');
    const skills = normalizeSkills(resumeData?.skills).slice(0, 6);
    const workLabels = extractWorkLabels(resumeData);
    const projectLabels = extractProjectLabels(resumeData);
    const internshipLabels = extractInternshipLabels(resumeData);
    const certifications = normalizeOneLineList(resumeData?.certifications).slice(0, 4);
    const achievements = normalizeOneLineList(resumeData?.achievements).slice(0, 3);

    const generated = [];

    if (title) {
        generated.push(`Target role focus: ${title}.`);
    }

    if (skills.length) {
        generated.push(`Core skills: ${skills.join(', ')}.`);
    }

    const workText = toDisplayList(workLabels, 3);
    if (workText) {
        generated.push(`Professional experience includes ${workText}.`);
    }

    const projectText = toDisplayList(projectLabels, 3);
    if (projectText) {
        generated.push(`Project experience includes ${projectText}.`);
    }

    const internshipText = toDisplayList(internshipLabels, 2);
    if (internshipText) {
        generated.push(`Internship exposure includes ${internshipText}.`);
    }

    if (certifications.length) {
        generated.push(`Certifications include ${certifications.join(', ')}.`);
    }

    if (achievements.length) {
        generated.push(`Achievements include ${achievements.join(', ')}.`);
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

    return finalLines.join('\n');
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

    let mergedLines = dedupeLines([...fromArray, ...fromText, ...fallbackLines]).slice(0, TARGET_BULLET_LINES);

    if (mergedLines.length < TARGET_BULLET_LINES) {
        const expandedLines = expandDescriptionLines([...fromText, ...fallbackLines]);
        mergedLines = dedupeLines([...mergedLines, ...expandedLines]).slice(0, TARGET_BULLET_LINES);
    }

    if (mergedLines.length < TARGET_BULLET_LINES) {
        const generated = buildContextFallbackBullets(contextLabel);
        mergedLines = dedupeLines([...mergedLines, ...generated]).slice(0, TARGET_BULLET_LINES);
    }

    return fillToFixedLineCount(mergedLines, TARGET_BULLET_LINES, buildContextFallbackBullets(contextLabel), {
        allowVerbRewrites: true,
    })
        .map((line) => normalizeBulletItem(line));
};

const normalizeWorkExperienceSection = ({ payloadItems, sourceItems }) => {
    const safePayloadItems = Array.isArray(payloadItems) ? payloadItems : [];
    const safeSourceItems = Array.isArray(sourceItems) ? sourceItems : [];

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
                    contextLabel: [safePayload.role || sourceItem.role, safePayload.company || sourceItem.company].filter(Boolean).join(' at '),
                }),
            };
        })
        .filter((item) => hasAnyText(item.company, item.role, ...item.bullets));
};

const normalizeProjectsSection = ({ payloadItems, sourceItems }) => {
    const safePayloadItems = Array.isArray(payloadItems) ? payloadItems : [];
    const safeSourceItems = Array.isArray(sourceItems) ? sourceItems : [];

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
                    contextLabel: title || sourceItem.name || 'project delivery',
                }),
            };
        })
        .filter((item) => hasAnyText(item.title, ...item.bullets));
};

const normalizeInternshipsSection = ({ payloadItems, sourceItems }) => {
    const safePayloadItems = Array.isArray(payloadItems) ? payloadItems : [];
    const safeSourceItems = Array.isArray(sourceItems) ? sourceItems : [];

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
                    contextLabel: [safePayload.role || sourceItem.role, safePayload.company || sourceItem.company].filter(Boolean).join(' at '),
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
        [safeAtsFeedback.missingKeywords, safePayload.missingKeywords],
        resumeSearchText,
        25,
    );
    const aiMissingSkills = filterTermsNotInResume(
        [safeAtsFeedback.missingSkills, safePayload.missingSkills],
        resumeSearchText,
        20,
    );

    return {
        summary: normalizeSummary(safePayload.summary, resumeData),
        workExperience: normalizeWorkExperienceSection({
            payloadItems: safePayload.workExperience,
            sourceItems: resumeData.workExperience,
        }),
        projects: normalizeProjectsSection({
            payloadItems: safePayload.projects,
            sourceItems: resumeData.projects,
        }),
        internships: normalizeInternshipsSection({
            payloadItems: safePayload.internships,
            sourceItems: resumeData.internships,
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
            whyScoreIsLower: ensureArrayOfStrings(
                safeAtsFeedback.whyScoreIsLower || safeAtsFeedback.scoreGaps || safePayload.whyScoreIsLower,
            ).slice(0, 8),
            missingKeywords: aiMissingKeywords,
            missingSkills: aiMissingSkills,
            improvementSteps: ensureArrayOfStrings(
                safeAtsFeedback.improvementSteps || safeAtsFeedback.actions || safePayload.improvementSteps,
            ).slice(0, 8),
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

    return `You are a senior professional resume writing expert.

Your task is to enhance the resume content provided by the user inside a resume builder application and provide actionable ATS-alignment feedback.

Rules:
1. Use only user-provided resume data.
2. Do not invent experience, tools, projects, metrics, or claims.
3. Keep language concise, ATS-optimized, and professional.
4. Summary must be exactly 4 meaningful lines.
5. Summary must be based on title, skills, and provided project/internship/experience data.
6. For each work experience item, return exactly 3 bullets.
7. For each project item, return exactly 3 bullets.
8. For each internship item, return exactly 3 bullets.
9. Every bullet must start with a strong action verb (Delivered, Engineered, Implemented, Optimized, Architected, Streamlined, Automated, Integrated, Developed, Deployed, Enhanced).
10. Every bullet must be one line and should use tools/technologies already present in user data when available.
11. Keep item order exactly the same as input.
12. If an input section is empty, return an empty array for that section.
13. Certifications, achievements, and hobbies must be concise single-line entries.
14. Normalize skills (dedupe and clean naming) without adding new skills.
15. Keep formatting clean with no symbols or markdown.
16. Return valid JSON only.
17. Generate "atsFeedback" using resume + job description context.
18. "missingKeywords" and "missingSkills" must be practical items that are absent or weakly represented.
19. Keep ATS feedback specific and concise.

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
      "bullets": ["string"]
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
                contextLabel: [item?.role, item?.company].filter(Boolean).join(' at '),
            }),
        })),
        projects: (Array.isArray(resumeData.projects) ? resumeData.projects : []).map((item) => ({
            title: String(item?.name || item?.title || '').trim(),
            bullets: normalizeBulletList({
                text: item?.description || '',
                fallbackText: item?.description || '',
                contextLabel: item?.name || item?.title || 'project delivery',
            }),
        })),
        internships: (Array.isArray(resumeData.internships) ? resumeData.internships : []).map((item) => ({
            company: String(item?.company || '').trim(),
            bullets: normalizeBulletList({
                text: item?.description || '',
                fallbackText: item?.description || '',
                contextLabel: [item?.role, item?.company].filter(Boolean).join(' at '),
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
