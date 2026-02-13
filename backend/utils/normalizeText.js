const { STOP_WORDS } = require('../constants/atsKeywords');

const normalizeText = (value = '') =>
    String(value)
        .replace(/\r\n/g, '\n')
        .replace(/[^\S\n]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

const tokenize = (value = '') =>
    normalizeText(value)
        .toLowerCase()
        .replace(/[^a-z0-9+\-./\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

const removeStopWords = (tokens = []) =>
    tokens.filter((token) => token.length > 1 && !STOP_WORDS.has(token));

const getWordFrequencyMap = (tokens = []) => {
    const map = new Map();
    for (const token of tokens) {
        map.set(token, (map.get(token) || 0) + 1);
    }
    return map;
};

module.exports = {
    normalizeText,
    tokenize,
    removeStopWords,
    getWordFrequencyMap,
};
