const { AppError } = require('../utils/response');
const { clamp, calculateSectionQualityScore } = require('../utils/scoreCalculator');
const { normalizeText, tokenize } = require('../utils/normalizeText');
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

const ensureObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const toTitleCase = (value = '') =>
    String(value || '')
        .split(' ')
        .map((token) => (token ? `${token.charAt(0).toUpperCase()}${token.slice(1)}` : ''))
        .join(' ')
        .trim();

const hasAnyText = (...values) => values.some((value) => Boolean(String(value || '').trim()));

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

    const matchedKeywords = jobDescriptionKeywords.filter((keyword) => resumeSet.has(keyword));
    const missingKeywords = jobDescriptionKeywords.filter((keyword) => !resumeSet.has(keyword));
    const missingSkills = missingKeywords.filter((keyword) => isTechnicalKeyword(keyword));
    const resumeSearchText = buildSearchText(combinedResumeText);
    const keywordPresenceMap = new Map(
        jobDescriptionKeywords.map((keyword) => [
            keyword,
            countKeywordOccurrences(resumeSearchText, keyword),
        ]),
    );

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

    const atsScore = Math.round(clamp(coverageScore * 0.5 + densityScore * 0.2 + sectionScore * 0.3));
    const recommendations = buildRecommendations(missingKeywords);

    const result = {
        extractedResumeSkills: extractedResumeSkills.slice(0, MAX_RESULT_KEYWORDS),
        normalizedResumeSkills: normalizedResumeSkills.slice(0, MAX_RESULT_KEYWORDS),
        normalizedUserSkills: normalizedUserSkills.slice(0, MAX_OUTPUT_LIST),
        jobDescriptionKeywords: jobDescriptionKeywords.slice(0, MAX_RESULT_KEYWORDS),
        matchedKeywords: matchedKeywords.slice(0, MAX_OUTPUT_LIST),
        missingKeywords: missingKeywords.slice(0, MAX_OUTPUT_LIST),
        missingSkills: missingSkills.slice(0, MAX_OUTPUT_LIST),
        atsScore,
        coverageScore: Math.round(coverageScore),
        densityScore: Math.round(densityScore),
        sectionScore: Math.round(sectionScore),
        recommendations,
    };

    return result;
};

module.exports = {
    calculateAtsScore,
};
