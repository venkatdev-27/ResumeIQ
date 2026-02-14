const { AppError } = require('../utils/response');
const { clamp, calculateSectionQualityScore } = require('../utils/scoreCalculator');
const { normalizeText, tokenize } = require('../utils/normalizeText');
const { requestChatCompletion } = require('./aiClient.service');
const {
    extractKeywordsFromText,
    normalizeKeywordTerm,
    normalizeSkillArray,
    dedupeNormalizedKeywords,
    parseUserSkillsInput,
    isTechnicalKeyword,
    getKeywordCategory,
    buildSearchText,
    countKeywordOccurrences,
} = require('./keywordExtract.service');

const MAX_RESULT_KEYWORDS = 120;
const MAX_OUTPUT_LIST = 120;
const MAX_RECOMMENDATIONS = 12;
const MAX_AI_RESUME_TEXT_CHARS = 5000;
const MAX_AI_JD_TEXT_CHARS = 4500;
const MAX_AI_LIST_PREVIEW = 80;
const WEAK_TECHNICAL_OCCURRENCE_THRESHOLD = 1;
const WEAK_VOCAB_OCCURRENCE_THRESHOLD = 0;

const ensureObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const toTitleCase = (value = '') =>
    String(value || '')
        .split(' ')
        .map((token) => (token ? `${token.charAt(0).toUpperCase()}${token.slice(1)}` : ''))
        .join(' ')
        .trim();

const hasAnyText = (...values) => values.some((value) => Boolean(String(value || '').trim()));

const truncateText = (value = '', max = 1200) => String(value || '').trim().slice(0, max);

const toSafeAiJson = (value, max = 3000) => JSON.stringify(value ?? '').slice(0, max);

const normalizeRecommendationList = (values = [], max = MAX_RECOMMENDATIONS) => {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
        .map((item) => String(item || '').trim())
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
        })
        .slice(0, max);
};

const ensurePrioritizedGapList = ({ candidates = [], preferred = [], max = MAX_OUTPUT_LIST }) => {
    const candidateSet = new Set(dedupeNormalizedKeywords(candidates, max));
    if (!candidateSet.size) {
        return [];
    }

    const ordered = [];
    const pushIfPresent = (keyword = '') => {
        const normalized = normalizeKeywordTerm(keyword);
        if (!normalized || !candidateSet.has(normalized)) {
            return;
        }
        if (!ordered.includes(normalized)) {
            ordered.push(normalized);
        }
    };

    (Array.isArray(preferred) ? preferred : []).forEach(pushIfPresent);
    [...candidateSet].forEach(pushIfPresent);

    return ordered.slice(0, max);
};

const parseJsonCandidate = (value = '') => {
    const cleaned = String(value || '')
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

    if (!cleaned) {
        return null;
    }

    try {
        return JSON.parse(cleaned);
    } catch (_error) {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
            return null;
        }

        try {
            return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
        } catch (_innerError) {
            return null;
        }
    }
};

const extractProfession = ({ resumeData = {}, resumeText = '' }) => {
    const safeResumeData = ensureObject(resumeData);
    const personalDetails = ensureObject(safeResumeData.personalDetails);
    const explicitTitle = String(personalDetails.title || '').trim();
    if (explicitTitle) {
        return explicitTitle.slice(0, 140);
    }

    const safeResumeText = String(resumeText || '');
    const labeledMatch = safeResumeText.match(/\b(?:title|role|position)\s*:\s*([^\n\r]+)/i);
    if (labeledMatch?.[1]) {
        return labeledMatch[1].trim().slice(0, 140);
    }

    const firstLines = safeResumeText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8);

    const titleLikeLine = firstLines.find((line) =>
        /(engineer|developer|analyst|scientist|manager|architect|consultant|designer|specialist|administrator)/i.test(line),
    );

    return String(titleLikeLine || '').slice(0, 140);
};

const collectResumeDataSkills = (resumeData = {}) => {
    const safeResumeData = ensureObject(resumeData);
    const skills = Array.isArray(safeResumeData.skills) ? safeResumeData.skills : [];
    return normalizeSkillArray(skills, 80);
};

const buildResumeSectionsText = (resumeData = {}) => {
    const safeResumeData = ensureObject(resumeData);
    const personalDetails = ensureObject(safeResumeData.personalDetails);
    const sections = [];

    if (hasAnyText(personalDetails.title, personalDetails.summary)) {
        sections.push([personalDetails.title, personalDetails.summary].filter(Boolean).join(' '));
    }

    (Array.isArray(safeResumeData.workExperience) ? safeResumeData.workExperience : []).forEach((entry) => {
        const safeEntry = ensureObject(entry);
        const text = [safeEntry.role, safeEntry.company, safeEntry.description].filter(Boolean).join(' ');
        if (text.trim()) {
            sections.push(text);
        }
    });

    (Array.isArray(safeResumeData.projects) ? safeResumeData.projects : []).forEach((entry) => {
        const safeEntry = ensureObject(entry);
        const text = [safeEntry.name, safeEntry.techStack, safeEntry.description].filter(Boolean).join(' ');
        if (text.trim()) {
            sections.push(text);
        }
    });

    (Array.isArray(safeResumeData.internships) ? safeResumeData.internships : []).forEach((entry) => {
        const safeEntry = ensureObject(entry);
        const text = [safeEntry.role, safeEntry.company, safeEntry.description].filter(Boolean).join(' ');
        if (text.trim()) {
            sections.push(text);
        }
    });

    const explicitSkills = collectResumeDataSkills(safeResumeData);
    if (explicitSkills.length) {
        sections.push(`skills: ${explicitSkills.join(', ')}`);
    }

    return normalizeText(sections.join('\n'));
};

const keywordWeight = (keyword = '', userSkillsSet = new Set(), explicitSkillsSet = new Set()) => {
    const normalized = normalizeKeywordTerm(keyword);
    if (!normalized) {
        return 1;
    }

    let weight = 1.15;

    if (isTechnicalKeyword(normalized)) {
        weight += 0.75;
    }

    if (normalized.split(' ').length > 1) {
        weight += 0.2;
    }

    if (userSkillsSet.has(normalized)) {
        weight += 0.35;
    }

    if (explicitSkillsSet.has(normalized)) {
        weight += 0.2;
    }

    return weight;
};

const calculateCoverageScore = ({
    jdKeywords = [],
    keywordPresenceMap = new Map(),
    resumeSet = new Set(),
    userSkillsSet = new Set(),
    explicitSkillsSet = new Set(),
}) => {
    if (!jdKeywords.length) {
        return 0;
    }

    let totalWeight = 0;
    let matchedWeight = 0;

    jdKeywords.forEach((keyword) => {
        const normalized = normalizeKeywordTerm(keyword);
        const weight = keywordWeight(normalized, userSkillsSet, explicitSkillsSet);
        totalWeight += weight;

        const presenceFromMap = Number(keywordPresenceMap.get(normalized) || 0);
        const presence = presenceFromMap > 0 || resumeSet.has(normalized) ? 1 : 0;
        if (presence > 0) {
            matchedWeight += weight;
            return;
        }

        if (userSkillsSet.has(normalized)) {
            matchedWeight += weight * 0.35;
        }
    });

    if (totalWeight <= 0) {
        return 0;
    }

    return clamp((matchedWeight / totalWeight) * 100);
};

const calculateDensityScore = ({
    searchText = '',
    jdKeywords = [],
    userSkillsSet = new Set(),
}) => {
    const tokens = tokenize(searchText);
    if (!tokens.length || !jdKeywords.length) {
        return 0;
    }

    let weightedMentions = 0;

    jdKeywords.forEach((keyword) => {
        const normalized = normalizeKeywordTerm(keyword);
        if (!normalized) {
            return;
        }

        const occurrences = countKeywordOccurrences(searchText, normalized);
        weightedMentions += occurrences;

        if (!occurrences && userSkillsSet.has(normalized)) {
            weightedMentions += 0.35;
        }
    });

    const densityPercent = (weightedMentions / Math.max(tokens.length, 1)) * 100;

    if (densityPercent < 0.6) {
        return clamp(22 + densityPercent * 20);
    }

    if (densityPercent < 1.5) {
        return clamp(40 + densityPercent * 18);
    }

    if (densityPercent <= 5.5) {
        return clamp(58 + (densityPercent - 1.5) * 8.5);
    }

    if (densityPercent <= 8.5) {
        return clamp(92 - (densityPercent - 5.5) * 8);
    }

    return clamp(55 - (densityPercent - 8.5) * 2.5);
};

const calculateSectionCompleteness = (resumeData = {}, resumeText = '', explicitSkillsSet = new Set(), userSkillsSet = new Set()) => {
    const safeResumeData = ensureObject(resumeData);
    const personalDetails = ensureObject(safeResumeData.personalDetails);

    const hasSummary = hasAnyText(personalDetails.summary, personalDetails.title);
    const hasExperience = (Array.isArray(safeResumeData.workExperience) ? safeResumeData.workExperience : []).some((entry) =>
        hasAnyText(entry?.role, entry?.company, entry?.description),
    );
    const hasProjects = (Array.isArray(safeResumeData.projects) ? safeResumeData.projects : []).some((entry) =>
        hasAnyText(entry?.name, entry?.techStack, entry?.description),
    );
    const hasInternships = (Array.isArray(safeResumeData.internships) ? safeResumeData.internships : []).some((entry) =>
        hasAnyText(entry?.role, entry?.company, entry?.description),
    );
    const hasEducation = (Array.isArray(safeResumeData.education) ? safeResumeData.education : []).some((entry) =>
        hasAnyText(entry?.degree, entry?.institution, entry?.description),
    );
    const hasSkills = explicitSkillsSet.size > 0 || userSkillsSet.size > 0;

    const structuredPresence =
        (hasSummary ? 18 : 0) +
        (hasExperience ? 24 : 0) +
        (hasProjects || hasInternships ? 20 : 0) +
        (hasSkills ? 22 : 0) +
        (hasEducation ? 16 : 0);

    const textBasedQuality = calculateSectionQualityScore(normalizeText(resumeText || ''));
    return clamp(structuredPresence * 0.65 + textBasedQuality * 0.35);
};

const calculateSkillsSectionStrength = ({
    jdKeywords = [],
    explicitSkillsSet = new Set(),
    userSkillsSet = new Set(),
}) => {
    const technicalJdKeywords = jdKeywords.filter((keyword) => isTechnicalKeyword(keyword));
    if (!technicalJdKeywords.length) {
        return clamp((explicitSkillsSet.size + userSkillsSet.size) * 6, 0, 100);
    }

    const matches = technicalJdKeywords.reduce((count, keyword) => {
        const normalized = normalizeKeywordTerm(keyword);
        if (explicitSkillsSet.has(normalized) || userSkillsSet.has(normalized)) {
            return count + 1;
        }
        return count;
    }, 0);

    return clamp((matches / technicalJdKeywords.length) * 100);
};

const chooseRecommendationSection = (keyword = '') => {
    const category = getKeywordCategory(keyword);

    if (['frameworks', 'languages', 'databases', 'tools'].includes(category)) {
        return 'skills';
    }

    if (['cloud', 'testing', 'architecture', 'ai_ml'].includes(category)) {
        return 'projects';
    }

    return 'experience';
};

const buildRecommendations = (missingKeywords = []) => {
    const normalizedMissing = dedupeNormalizedKeywords(missingKeywords, MAX_OUTPUT_LIST);

    if (!normalizedMissing.length) {
        return [];
    }

    const recommendations = [];
    const seen = new Set();

    for (const keyword of normalizedMissing) {
        if (recommendations.length >= MAX_RECOMMENDATIONS) {
            break;
        }

        const section = chooseRecommendationSection(keyword);
        const titleKeyword = toTitleCase(keyword);

        let recommendation = '';
        if (section === 'skills') {
            recommendation = `Include ${titleKeyword} in skills section`;
        } else if (section === 'projects') {
            recommendation = `Add ${titleKeyword} in projects section`;
        } else {
            recommendation = `Use ${titleKeyword} in experience bullet points`;
        }

        const key = recommendation.toLowerCase();
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        recommendations.push(recommendation);
    }

    return recommendations;
};

const buildAiAtsPrompt = ({
    profession = '',
    resumeText = '',
    jobDescription = '',
    normalizedUserSkills = [],
    normalizedResumeSkills = [],
    jobDescriptionKeywords = [],
    matchedKeywords = [],
    missingSkills = [],
    missingKeywords = [],
    coverageScore = 0,
    densityScore = 0,
    sectionScore = 0,
    atsScore = 0,
}) => {
    const professionPreview = truncateText(profession, 140);
    const resumePreview = truncateText(resumeText, MAX_AI_RESUME_TEXT_CHARS);
    const jdPreview = truncateText(jobDescription, MAX_AI_JD_TEXT_CHARS);

    return `You are a strict ATS scoring engine.

Return ONLY valid JSON with this exact schema:
{
  "atsScore": 0,
  "coverageScore": 0,
  "densityScore": 0,
  "sectionScore": 0,
  "matchedKeywords": ["string"],
  "missingSkills": ["string"],
  "missingKeywords": ["string"],
  "recommendations": ["string"]
}

Rules:
1. Score dynamically using resume content, profession, user skills, and job description.
2. Do not output dummy/fixed scores.
3. Keep scores realistic integers 0-100.
4. missingSkills must contain technical JD terms absent or weak in the resume.
5. missingKeywords must contain non-technical JD terms absent or weak in the resume.
6. Recommendations must be actionable and based only on missingSkills/missingKeywords.
7. Do not invent unrelated keywords.

Context:
profession: ${toSafeAiJson(professionPreview, 220)}
userSkillsNormalized: ${toSafeAiJson(normalizedUserSkills.slice(0, MAX_AI_LIST_PREVIEW), 2200)}
resumeSkillsNormalized: ${toSafeAiJson(normalizedResumeSkills.slice(0, MAX_AI_LIST_PREVIEW), 2200)}
jobDescriptionKeywords: ${toSafeAiJson(jobDescriptionKeywords.slice(0, MAX_AI_LIST_PREVIEW), 2600)}
baselineMatchedKeywords: ${toSafeAiJson(matchedKeywords.slice(0, MAX_AI_LIST_PREVIEW), 2600)}
baselineMissingSkills: ${toSafeAiJson(missingSkills.slice(0, MAX_AI_LIST_PREVIEW), 2600)}
baselineMissingKeywords: ${toSafeAiJson(missingKeywords.slice(0, MAX_AI_LIST_PREVIEW), 2600)}
baselineScores: ${toSafeAiJson({ atsScore, coverageScore, densityScore, sectionScore }, 600)}
resumeText: ${toSafeAiJson(resumePreview, MAX_AI_RESUME_TEXT_CHARS + 200)}
jobDescriptionText: ${toSafeAiJson(jdPreview, MAX_AI_JD_TEXT_CHARS + 200)}`;
};

const normalizeAiScore = (value, fallback = 0) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return Math.round(clamp(fallback));
    }
    return Math.round(clamp(numeric));
};

const sanitizeAiKeywordList = ({
    values = [],
    jdKeywordSet = new Set(),
    technicalOnly = false,
    nonTechnicalOnly = false,
    excludeSet = new Set(),
}) =>
    dedupeNormalizedKeywords(values, MAX_OUTPUT_LIST)
        .filter((keyword) => {
            if (!jdKeywordSet.has(keyword)) {
                return false;
            }

            if (excludeSet.has(keyword)) {
                return false;
            }

            if (technicalOnly) {
                return isTechnicalKeyword(keyword);
            }

            if (nonTechnicalOnly) {
                return !isTechnicalKeyword(keyword);
            }

            return true;
        })
        .slice(0, MAX_OUTPUT_LIST);

const refineAtsScoreWithAi = async ({
    profession = '',
    combinedResumeText = '',
    normalizedJobDescription = '',
    normalizedUserSkills = [],
    normalizedResumeSkills = [],
    jobDescriptionKeywords = [],
    matchedKeywords = [],
    missingSkills = [],
    missingKeywords = [],
    coverageScore = 0,
    densityScore = 0,
    sectionScore = 0,
    atsScore = 0,
}) => {
    if (!String(process.env.OPENROUTER_API_KEY || '').trim()) {
        return null;
    }

    const prompt = buildAiAtsPrompt({
        profession,
        resumeText: combinedResumeText,
        jobDescription: normalizedJobDescription,
        normalizedUserSkills,
        normalizedResumeSkills,
        jobDescriptionKeywords,
        matchedKeywords,
        missingSkills,
        missingKeywords,
        coverageScore,
        densityScore,
        sectionScore,
        atsScore,
    });

    const responseText = await requestChatCompletion({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 1200,
        jsonMode: true,
        expectJson: true,
        timeoutMs: 60_000,
    });

    const parsed = ensureObject(parseJsonCandidate(responseText));
    if (!Object.keys(parsed).length) {
        return null;
    }

    const jdKeywordSet = new Set(jobDescriptionKeywords);
    const safeMatched = sanitizeAiKeywordList({
        values: parsed.matchedKeywords,
        jdKeywordSet,
    });
    const safeMissingSkills = sanitizeAiKeywordList({
        values: parsed.missingSkills,
        jdKeywordSet,
        technicalOnly: true,
        excludeSet: new Set(safeMatched),
    });
    const safeMissingKeywords = sanitizeAiKeywordList({
        values: parsed.missingKeywords,
        jdKeywordSet,
        nonTechnicalOnly: true,
        excludeSet: new Set([...safeMatched, ...safeMissingSkills]),
    });
    const safeRecommendations = normalizeRecommendationList(parsed.recommendations, MAX_RECOMMENDATIONS);

    return {
        atsScore: normalizeAiScore(parsed.atsScore, atsScore),
        coverageScore: normalizeAiScore(parsed.coverageScore, coverageScore),
        densityScore: normalizeAiScore(parsed.densityScore, densityScore),
        sectionScore: normalizeAiScore(parsed.sectionScore, sectionScore),
        matchedKeywords: safeMatched,
        missingSkills: safeMissingSkills,
        missingKeywords: safeMissingKeywords,
        recommendations: safeRecommendations,
    };
};

const calculateAtsScore = async ({
    resumeText,
    resumeData = null,
    jobDescription = '',
    userSkills = '',
}) => {
    const normalizedResumeText = normalizeText(resumeText || '');

    if (!normalizedResumeText.trim()) {
        throw new AppError('Resume text is required for ATS analysis.', 400);
    }

    const safeResumeData = ensureObject(resumeData);
    const profession = extractProfession({
        resumeData: safeResumeData,
        resumeText: normalizedResumeText,
    });
    const resumeSectionsText = buildResumeSectionsText(safeResumeData);
    const combinedResumeText = normalizeText([normalizedResumeText, resumeSectionsText].filter(Boolean).join('\n'));
    const normalizedJobDescription = normalizeText(jobDescription || '');

    const explicitSkills = collectResumeDataSkills(safeResumeData);
    const explicitSkillsSet = new Set(explicitSkills);
    const { normalizedSkills: normalizedUserSkills } = parseUserSkillsInput(userSkills, 80);
    const normalizedUserSkillsSet = new Set(normalizedUserSkills);

    const jdKeywordEntries = extractKeywordsFromText(normalizedJobDescription, {
        maxKeywords: MAX_RESULT_KEYWORDS,
        includeSoftSkills: true,
    });
    const jobDescriptionKeywords = dedupeNormalizedKeywords(
        jdKeywordEntries.map((item) => item.normalized),
        MAX_RESULT_KEYWORDS,
    );
    const includeSoftSkillsInResume = jdKeywordEntries.some((item) => item?.category === 'soft_skills');

    const resumeKeywordEntries = extractKeywordsFromText(combinedResumeText, {
        maxKeywords: MAX_RESULT_KEYWORDS,
        includeSoftSkills: includeSoftSkillsInResume,
    });
    const extractedResumeSkills = resumeKeywordEntries.map((item) => item.term).slice(0, MAX_RESULT_KEYWORDS);
    const normalizedResumeFromText = resumeKeywordEntries.map((item) => item.normalized);
    const normalizedResumeSkills = dedupeNormalizedKeywords(
        [...normalizedResumeFromText, ...explicitSkills],
        MAX_RESULT_KEYWORDS,
    );

    const resumeSet = new Set(normalizedResumeSkills);
    const resumeSearchText = buildSearchText(combinedResumeText);
    const keywordPresenceMap = new Map(
        jobDescriptionKeywords.map((keyword) => [
            keyword,
            countKeywordOccurrences(resumeSearchText, keyword),
        ]),
    );

    const isKeywordPresentInResume = (keyword = '') => {
        const normalized = normalizeKeywordTerm(keyword);
        const key = normalized || keyword;
        const occurrences = Number(keywordPresenceMap.get(key) || 0);

        if (occurrences > 0) {
            return true;
        }

        return resumeSet.has(key);
    };

    const technicalJdKeywords = jobDescriptionKeywords.filter((keyword) => isTechnicalKeyword(keyword));
    const nonTechnicalJdKeywords = jobDescriptionKeywords.filter((keyword) => !isTechnicalKeyword(keyword));

    const missingTechnicalKeywords = technicalJdKeywords.filter((keyword) => !isKeywordPresentInResume(keyword));
    const weakTechnicalKeywords = technicalJdKeywords.filter((keyword) => {
        const normalized = normalizeKeywordTerm(keyword);
        if (!normalized) {
            return false;
        }

        if (!isKeywordPresentInResume(normalized)) {
            return false;
        }

        const occurrences = Number(keywordPresenceMap.get(normalized) || 0);
        const inSkillsSection = explicitSkillsSet.has(normalized) || normalizedUserSkillsSet.has(normalized);
        return occurrences <= WEAK_TECHNICAL_OCCURRENCE_THRESHOLD && !inSkillsSection;
    });

    const missingVocabularyKeywords = nonTechnicalJdKeywords.filter((keyword) => !isKeywordPresentInResume(keyword));
    const weakVocabularyKeywords = nonTechnicalJdKeywords.filter((keyword) => {
        const normalized = normalizeKeywordTerm(keyword);
        if (!normalized) {
            return false;
        }

        if (!isKeywordPresentInResume(normalized)) {
            return false;
        }

        const occurrences = Number(keywordPresenceMap.get(normalized) || 0);
        return occurrences <= WEAK_VOCAB_OCCURRENCE_THRESHOLD;
    });

    const missingSkills = ensurePrioritizedGapList({
        candidates: [...missingTechnicalKeywords, ...weakTechnicalKeywords],
        preferred: [...missingTechnicalKeywords, ...technicalJdKeywords],
        max: MAX_OUTPUT_LIST,
    });
    const missingKeywords = ensurePrioritizedGapList({
        candidates: [...missingVocabularyKeywords, ...weakVocabularyKeywords],
        preferred: [...missingVocabularyKeywords, ...nonTechnicalJdKeywords],
        max: MAX_OUTPUT_LIST,
    });
    const allMissingKeywords = dedupeNormalizedKeywords([...missingSkills, ...missingKeywords], MAX_OUTPUT_LIST);
    const missingSet = new Set(allMissingKeywords);
    const matchedKeywords = jobDescriptionKeywords.filter((keyword) => !missingSet.has(normalizeKeywordTerm(keyword)));

    const coverageScore = jobDescriptionKeywords.length
        ? calculateCoverageScore({
              jdKeywords: jobDescriptionKeywords,
              keywordPresenceMap,
              resumeSet,
              userSkillsSet: normalizedUserSkillsSet,
              explicitSkillsSet,
          })
        : clamp((normalizedResumeSkills.length / 80) * 100);

    const densityScore = jobDescriptionKeywords.length
        ? calculateDensityScore({
              searchText: resumeSearchText,
              jdKeywords: jobDescriptionKeywords,
              userSkillsSet: normalizedUserSkillsSet,
          })
        : clamp((resumeKeywordEntries.length / 70) * 100);

    const skillsSectionStrength = calculateSkillsSectionStrength({
        jdKeywords: jobDescriptionKeywords,
        explicitSkillsSet,
        userSkillsSet: normalizedUserSkillsSet,
    });
    const sectionCompleteness = calculateSectionCompleteness(
        safeResumeData,
        combinedResumeText,
        explicitSkillsSet,
        normalizedUserSkillsSet,
    );
    const sectionScore = clamp(skillsSectionStrength * 0.55 + sectionCompleteness * 0.45);

    const baseAtsScore = Math.round(clamp(coverageScore * 0.5 + densityScore * 0.2 + sectionScore * 0.3));
    const baseRecommendations = buildRecommendations([...missingSkills, ...missingKeywords]);

    let finalAtsScore = baseAtsScore;
    let finalCoverageScore = coverageScore;
    let finalDensityScore = densityScore;
    let finalSectionScore = sectionScore;
    let finalMatchedKeywords = matchedKeywords;
    let finalMissingSkills = missingSkills;
    let finalMissingKeywords = missingKeywords;
    let finalRecommendations = baseRecommendations;

    try {
        const aiRefinement = await refineAtsScoreWithAi({
            profession,
            combinedResumeText,
            normalizedJobDescription,
            normalizedUserSkills,
            normalizedResumeSkills,
            jobDescriptionKeywords,
            matchedKeywords,
            missingSkills,
            missingKeywords,
            coverageScore,
            densityScore,
            sectionScore,
            atsScore: baseAtsScore,
        });

        if (aiRefinement) {
            finalAtsScore = aiRefinement.atsScore;
            finalCoverageScore = aiRefinement.coverageScore;
            finalDensityScore = aiRefinement.densityScore;
            finalSectionScore = aiRefinement.sectionScore;

            if (aiRefinement.matchedKeywords.length) {
                finalMatchedKeywords = aiRefinement.matchedKeywords;
            }

            if (aiRefinement.missingSkills.length || aiRefinement.missingKeywords.length) {
                finalMissingSkills = aiRefinement.missingSkills.length ? aiRefinement.missingSkills : missingSkills;
                finalMissingKeywords = aiRefinement.missingKeywords.length ? aiRefinement.missingKeywords : missingKeywords;
            }

            if (aiRefinement.recommendations.length) {
                finalRecommendations = aiRefinement.recommendations;
            } else {
                finalRecommendations = buildRecommendations([...finalMissingSkills, ...finalMissingKeywords]);
            }
        }
    } catch (_error) {
        finalRecommendations = baseRecommendations;
    }

    const result = {
        extractedResumeSkills: extractedResumeSkills.slice(0, MAX_RESULT_KEYWORDS),
        normalizedResumeSkills: normalizedResumeSkills.slice(0, MAX_RESULT_KEYWORDS),
        normalizedUserSkills: normalizedUserSkills.slice(0, MAX_OUTPUT_LIST),
        jobDescriptionKeywords: jobDescriptionKeywords.slice(0, MAX_RESULT_KEYWORDS),
        matchedKeywords: finalMatchedKeywords.slice(0, MAX_OUTPUT_LIST),
        missingKeywords: finalMissingKeywords.slice(0, MAX_OUTPUT_LIST),
        missingSkills: finalMissingSkills.slice(0, MAX_OUTPUT_LIST),
        atsScore: Math.round(clamp(finalAtsScore)),
        coverageScore: Math.round(clamp(finalCoverageScore)),
        densityScore: Math.round(clamp(finalDensityScore)),
        sectionScore: Math.round(clamp(finalSectionScore)),
        recommendations: finalRecommendations,
    };

    return result;
};

module.exports = {
    calculateAtsScore,
};
