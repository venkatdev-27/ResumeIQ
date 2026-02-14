const { AppError } = require('../utils/response');
const { requestChatCompletion } = require('./aiClient.service');

const MAX_AI_PAYLOAD_CHARS = 12_000;

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

const normalizeSummary = (value = '', resumeData = {}) => {
    const cleaned = normalizeLineBreaks(value).replace(/^[\u2022*-]+\s*/gm, '');
    const primaryLines = cleaned ? normalizeToLines(cleaned) : [];
    const candidateLines = primaryLines.length ? primaryLines : normalizeToSentences(cleaned);
    const fallbackLines = buildSummaryFallbackLines(resumeData);
    const mergedLines = dedupeLines([...candidateLines, ...fallbackLines]);

    if (mergedLines.length >= 3) {
        return mergedLines.slice(0, 4).join('\n');
    }

    const expandedLines = dedupeLines(
        mergedLines.flatMap((line) =>
            String(line || '')
                .split(/[,;]\s+/)
                .map((part) => part.trim())
                .filter(Boolean),
        ),
    );

    return dedupeLines([...mergedLines, ...expandedLines]).slice(0, 4).join('\n');
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
        .trim();

const normalizeBulletList = ({ bullets = [], text = '', fallbackText = '' }) => {
    const fromArray = ensureArrayOfStrings(bullets).map((item) => normalizeBulletItem(item)).filter(Boolean);
    const fromText = toCandidateDescriptionLines(text);
    const fallbackLines = toCandidateDescriptionLines(fallbackText);

    let mergedLines = dedupeLines([...fromArray, ...fromText, ...fallbackLines]).slice(0, 4);

    if (mergedLines.length < 3) {
        const expandedLines = expandDescriptionLines([...fromText, ...fallbackLines]);
        mergedLines = dedupeLines([...mergedLines, ...expandedLines]).slice(0, 4);
    }

    return mergedLines;
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
        certifications: ensureArrayOfStrings(safeResumeData.certifications),
        achievements: ensureArrayOfStrings(safeResumeData.achievements),
        hobbies: ensureArrayOfStrings(safeResumeData.hobbies),
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
        achievements:
            Array.isArray(resumeData.achievements) && resumeData.achievements.length
                ? ensureArrayOfStrings(safePayload.achievements).slice(0, 20)
                : [],
        hobbies:
            Array.isArray(resumeData.hobbies) && resumeData.hobbies.length
                ? ensureArrayOfStrings(safePayload.hobbies).slice(0, 20)
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
1. Do not invent new experience.
2. Do not fabricate numbers or metrics.
3. Do not exaggerate.
4. Improve grammar, clarity, and vocabulary.
5. Generate a engaging, professional summary of 4 to 5 sentences max (approx. 4-7 lines).
6. For each work experience, generate 3 to 4 strong professional bullet points.
7. For each project, generate 3 to 4 technical bullet points.
8. For each internship, generate 3 to 4 professional bullet points.
9. Improve skills section wording.
10. Enhance achievements section professionally.
11. Refine hobbies section into professional format.
12. Avoid repetition.
13. Keep formatting clean.
14. No decorative symbols.
15. Return only structured JSON.
16. Keep item order exactly the same as input.
17. If a section is empty in input, return an empty array for that section.
18. Generate "atsFeedback" using resume + job description context.
19. "missingKeywords" and "missingSkills" must be practical items absent or weakly represented in resume.
20. Keep feedback specific and concise (no generic filler).

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

    const fallbackLines = buildSummaryFallbackLines(resumeData);
    if (fallbackLines.length) {
        return fallbackLines.join('\n');
    }

    const title = String(resumeData?.personalDetails?.title || '').trim();
    const skills = normalizeSkills(resumeData?.skills).slice(0, 4);

    if (title && skills.length) {
        return `${title} with practical experience in ${skills.join(', ')}.`;
    }
    if (title) {
        return `${title} with practical project and work experience.`;
    }
    if (skills.length) {
        return `Professional with practical experience in ${skills.join(', ')}.`;
    }

    return 'Professional candidate with practical project and work experience.';
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
            bullets: toCandidateDescriptionLines(item?.description || '').slice(0, 4),
        })),
        projects: (Array.isArray(resumeData.projects) ? resumeData.projects : []).map((item) => ({
            title: String(item?.name || item?.title || '').trim(),
            bullets: toCandidateDescriptionLines(item?.description || '').slice(0, 4),
        })),
        internships: (Array.isArray(resumeData.internships) ? resumeData.internships : []).map((item) => ({
            company: String(item?.company || '').trim(),
            bullets: toCandidateDescriptionLines(item?.description || '').slice(0, 4),
        })),
        skills: normalizeSkills(resumeData.skills),
        achievements: ensureArrayOfStrings(resumeData.achievements).slice(0, 20),
        hobbies: ensureArrayOfStrings(resumeData.hobbies).slice(0, 20),
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
