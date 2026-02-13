const Joi = require('joi');
const { AppError } = require('../utils/response');

const personalDetailsSchema = Joi.object({
    fullName: Joi.string().allow('').optional(),
    email: Joi.string().allow('').optional(),
    phone: Joi.string().allow('').optional(),
    location: Joi.string().allow('').optional(),
    title: Joi.string().allow('').optional(),
    summary: Joi.string().allow('').optional(),
    linkedin: Joi.string().allow('').optional(),
    website: Joi.string().allow('').optional(),
});

const experienceItemSchema = Joi.object({
    company: Joi.string().allow('').optional(),
    role: Joi.string().allow('').optional(),
    startDate: Joi.string().allow('').optional(),
    endDate: Joi.string().allow('').optional(),
    description: Joi.string().allow('').optional(),
});

const projectItemSchema = Joi.object({
    name: Joi.string().allow('').optional(),
    techStack: Joi.string().allow('').optional(),
    link: Joi.string().allow('').optional(),
    description: Joi.string().allow('').optional(),
});

const educationItemSchema = Joi.object({
    institution: Joi.string().allow('').optional(),
    degree: Joi.string().allow('').optional(),
    startYear: Joi.string().allow('').optional(),
    endYear: Joi.string().allow('').optional(),
    description: Joi.string().allow('').optional(),
});

const resumeDataSchema = Joi.object({
    personalDetails: personalDetailsSchema.default({}),
    workExperience: Joi.array().items(experienceItemSchema).default([]),
    projects: Joi.array().items(projectItemSchema).default([]),
    internships: Joi.array().items(experienceItemSchema).default([]),
    education: Joi.array().items(educationItemSchema).default([]),
    skills: Joi.array().items(Joi.string()).default([]),
    certifications: Joi.array().items(Joi.string()).default([]),
    achievements: Joi.array().items(Joi.string()).default([]),
    hobbies: Joi.array().items(Joi.string()).default([]),
});

const resumeUploadSchema = Joi.object({
    resumeText: Joi.string().trim().allow('').optional(),
    templateName: Joi.string().trim().allow('').optional(),
    resumeData: Joi.alternatives().try(resumeDataSchema, Joi.string()).optional(),
});

const atsRequestSchema = Joi.object({
    resumeText: Joi.string().trim().min(20).optional(),
    jobDescription: Joi.string().trim().allow('').optional(),
    resumeId: Joi.string().trim().length(24).hex().optional(),
}).or('resumeText', 'resumeId');

const aiImproveSchema = Joi.object({
    resumeData: resumeDataSchema.required(),
    jobDescription: Joi.string().trim().allow('').optional().default(''),
    resumeId: Joi.string().trim().optional(),
    atsScore: Joi.alternatives().try(Joi.number(), Joi.string()).optional().default(''),
    matchedKeywords: Joi.array().items(Joi.string()).optional().default([]),
    missingKeywords: Joi.array().items(Joi.string()).optional().default([]),
    missingSkills: Joi.array().items(Joi.string()).optional().default([]),
});

const generatePdfSchema = Joi.object({
    html: Joi.string().trim().min(20).required(),
    fileName: Joi.string().trim().allow('').optional(),
});

const validateBody = (schema) => (req, _res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        const details = error.details.map((item) => item.message);
        return next(
            new AppError(
                details.join(', '),
                400,
                details,
            ),
        );
    }

    req.body = value;
    return next();
};

module.exports = {
    validateResumeUploadBody: validateBody(resumeUploadSchema),
    validateAtsRequestBody: validateBody(atsRequestSchema),
    validateAiImproveBody: validateBody(aiImproveSchema),
    validateGeneratePdfBody: validateBody(generatePdfSchema),
};
