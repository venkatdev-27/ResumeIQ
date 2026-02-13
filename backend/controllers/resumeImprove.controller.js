const { improveResumeWithGemini } = require('../services/aiRewrite.service');
const { AppError, asyncHandler, sendSuccess } = require('../utils/response');

const resumeImproveController = asyncHandler(async (req, res) => {
    const {
        resumeData,
        jobDescription = '',
        atsScore = '',
        matchedKeywords = [],
        missingKeywords = [],
        missingSkills = [],
    } = req.body;

    if (!resumeData || typeof resumeData !== 'object' || Array.isArray(resumeData)) {
        throw new AppError('Invalid resumeData payload.', 400);
    }

    const result = await improveResumeWithGemini({
        resumeData,
        jobDescription,
        atsScore,
        matchedKeywords,
        missingKeywords,
        missingSkills,
    });

    return sendSuccess(res, result, 'AI resume improvements generated successfully', 200);
});

module.exports = {
    resumeImproveController,
};
