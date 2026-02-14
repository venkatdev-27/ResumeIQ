const { calculateAtsScore } = require('../services/atsScore.service');
const mongoose = require('mongoose');
const Resume = require('../models/Resume.model');
const { AppError, asyncHandler, sendSuccess } = require('../utils/response');

const resolveResumeContext = async ({ userId, resumeText, resumeId }) => {
    const directText = String(resumeText || '').trim();

    let resumeDoc = null;

    if (resumeId) {
        if (!mongoose.Types.ObjectId.isValid(resumeId)) {
            throw new AppError('Invalid resume ID.', 400);
        }

        resumeDoc = await Resume.findOne({
            _id: resumeId,
            user: userId,
        }).select('text resumeData');
    } else {
        resumeDoc = await Resume.findOne({
            user: userId,
        })
            .sort({ updatedAt: -1 })
            .select('text resumeData');
    }

    const storedText = String(resumeDoc?.text || '').trim();
    const effectiveText = directText || storedText;

    if (!effectiveText) {
        throw new AppError('No uploaded resume text found. Upload a resume first or provide resumeText.', 400);
    }

    return {
        text: effectiveText,
        resumeData: resumeDoc?.resumeData || null,
    };
};

const getScore = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
        throw new AppError('Unauthorized user context.', 401);
    }

    const { resumeText, resumeId } = req.body;
    const context = await resolveResumeContext({
        userId,
        resumeText,
        resumeId,
    });

    const atsResult = await calculateAtsScore({
        resumeText: context.text,
        resumeData: context.resumeData,
    });

    return sendSuccess(res, atsResult, 'ATS score calculated successfully', 200);
});

module.exports = {
    getScore,
};
