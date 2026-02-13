const { generateAiImprovements } = require('../services/aiRewrite.service');
const { asyncHandler, sendSuccess } = require('../utils/response');

const getSuggestions = asyncHandler(async (req, res) => {
    const { resumeData, jobDescription, atsScore, matchedKeywords, missingKeywords } = req.body;
    const aiResult = await generateAiImprovements({
        resumeData,
        jobDescription,
        atsScore,
        matchedKeywords,
        missingKeywords,
    });

    return sendSuccess(res, aiResult, 'AI improvement suggestions generated successfully', 200);
});

module.exports = {
    getSuggestions,
};
