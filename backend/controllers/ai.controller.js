const { generateAiImprovements } = require('../services/aiRewrite.service');
const { AppError, asyncHandler, sendSuccess } = require('../utils/response');

const getSuggestions = asyncHandler(async (req, res) => {
    if (!req.user?._id) {
        throw new AppError('Unauthorized user context.', 401);
    }

    const { resumeData, jobDescription, atsScore, matchedKeywords, missingKeywords, missingSkills } = req.body;
    const aiResult = await generateAiImprovements({
        resumeData,
        jobDescription,
        atsScore,
        matchedKeywords,
        missingKeywords,
        missingSkills,
    });

    return sendSuccess(res, aiResult, 'AI improvement suggestions generated successfully', 200);
});

module.exports = {
    getSuggestions,
};
