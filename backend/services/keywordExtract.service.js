const { ATS_PRIORITY_KEYWORDS } = require('../constants/atsKeywords');
const { tokenize, removeStopWords, getWordFrequencyMap } = require('../utils/normalizeText');

const buildNGrams = (tokens, maxGram = 3) => {
    const grams = [];
    for (let size = 1; size <= maxGram; size += 1) {
        for (let i = 0; i <= tokens.length - size; i += 1) {
            grams.push(tokens.slice(i, i + size).join(' '));
        }
    }
    return grams;
};

const extractKeywordsFromText = (text, options = {}) => {
    const { maxKeywords = 40 } = options;
    const tokens = removeStopWords(tokenize(text));
    const frequencyMap = getWordFrequencyMap(tokens);
    const ngramFrequency = getWordFrequencyMap(buildNGrams(tokens, 3));
    const keywordScores = new Map();

    for (const [term, count] of frequencyMap.entries()) {
        const lengthBoost = term.length > 6 ? 1.1 : 1;
        keywordScores.set(term, count * lengthBoost);
    }

    for (const [phrase, count] of ngramFrequency.entries()) {
        if (phrase.split(' ').length === 1) {
            continue;
        }

        if (count >= 1) {
            const phraseBoost = phrase.split(' ').length === 2 ? 1.35 : 1.6;
            keywordScores.set(phrase, (keywordScores.get(phrase) || 0) + count * phraseBoost);
        }
    }

    for (const priority of ATS_PRIORITY_KEYWORDS) {
        if (String(text).toLowerCase().includes(priority.toLowerCase())) {
            keywordScores.set(priority.toLowerCase(), (keywordScores.get(priority.toLowerCase()) || 0) + 3.5);
        }
    }

    return [...keywordScores.entries()]
        .filter(([term]) => term.length > 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxKeywords)
        .map(([term, score]) => ({ term, score }));
};

module.exports = {
    extractKeywordsFromText,
};
