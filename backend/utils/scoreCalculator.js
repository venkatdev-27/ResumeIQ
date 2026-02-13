const { SECTION_HINTS } = require('../constants/atsKeywords');
const { tokenize } = require('./normalizeText');

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const calculateCoverageScore = ({ matchedWeight, totalWeight }) => {
    if (!totalWeight || totalWeight <= 0) {
        return 0;
    }
    return clamp((matchedWeight / totalWeight) * 100);
};

const calculateKeywordDensityScore = ({ resumeText, matchedKeywords }) => {
    const tokens = tokenize(resumeText);
    if (!tokens.length || !matchedKeywords.length) {
        return 0;
    }

    const resumeString = ` ${tokens.join(' ')} `;
    const totalMentions = matchedKeywords.reduce((count, keyword) => {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(` ${escaped} `, 'g');
        const mentions = (resumeString.match(regex) || []).length;
        return count + mentions;
    }, 0);

    const densityPercentage = (totalMentions / tokens.length) * 100;

    if (densityPercentage < 1) {
        return 35;
    }
    if (densityPercentage > 12) {
        return 55;
    }

    return clamp(40 + densityPercentage * 5);
};

const calculateSectionQualityScore = (resumeText = '') => {
    const normalized = resumeText.toLowerCase();
    const sectionHits = Object.values(SECTION_HINTS).reduce((hits, phrases) => {
        const found = phrases.some((phrase) => normalized.includes(phrase));
        return hits + (found ? 1 : 0);
    }, 0);

    const sectionCoverage = (sectionHits / Object.keys(SECTION_HINTS).length) * 100;
    const numericSignals = (resumeText.match(/\b\d+([.,]\d+)?%?\b/g) || []).length;
    const quantifiedImpactScore = clamp(numericSignals * 4, 0, 30);

    return clamp(sectionCoverage * 0.7 + quantifiedImpactScore);
};

const calculateOverallScore = ({ coverageScore, densityScore, sectionScore }) =>
    clamp(coverageScore * 0.55 + densityScore * 0.2 + sectionScore * 0.25);

module.exports = {
    clamp,
    calculateCoverageScore,
    calculateKeywordDensityScore,
    calculateSectionQualityScore,
    calculateOverallScore,
};
