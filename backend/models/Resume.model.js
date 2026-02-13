const mongoose = require('mongoose');

const experienceItemSchema = new mongoose.Schema(
    {
        company: { type: String, default: '' },
        role: { type: String, default: '' },
        startDate: { type: String, default: '' },
        endDate: { type: String, default: '' },
        description: { type: String, default: '' },
    },
    { _id: false },
);

const projectItemSchema = new mongoose.Schema(
    {
        name: { type: String, default: '' },
        techStack: { type: String, default: '' },
        link: { type: String, default: '' },
        description: { type: String, default: '' },
    },
    { _id: false },
);

const educationItemSchema = new mongoose.Schema(
    {
        institution: { type: String, default: '' },
        degree: { type: String, default: '' },
        startYear: { type: String, default: '' },
        endYear: { type: String, default: '' },
        description: { type: String, default: '' },
    },
    { _id: false },
);

const personalDetailsSchema = new mongoose.Schema(
    {
        fullName: { type: String, default: '' },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        location: { type: String, default: '' },
        title: { type: String, default: '' },
        summary: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        website: { type: String, default: '' },
    },
    { _id: false },
);

const resumeDataSchema = new mongoose.Schema(
    {
        personalDetails: {
            type: personalDetailsSchema,
            default: () => ({}),
        },
        workExperience: {
            type: [experienceItemSchema],
            default: [],
        },
        projects: {
            type: [projectItemSchema],
            default: [],
        },
        internships: {
            type: [experienceItemSchema],
            default: [],
        },
        education: {
            type: [educationItemSchema],
            default: [],
        },
        skills: {
            type: [String],
            default: [],
        },
        certifications: {
            type: [String],
            default: [],
        },
        achievements: {
            type: [String],
            default: [],
        },
        hobbies: {
            type: [String],
            default: [],
        },
    },
    { _id: false },
);

const resumeSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        templateName: {
            type: String,
            default: 'template1',
            trim: true,
        },
        resumeData: {
            type: resumeDataSchema,
            default: () => ({}),
        },
        fileName: {
            type: String,
            default: '',
        },
        mimeType: {
            type: String,
            default: 'application/octet-stream',
        },
        size: {
            type: Number,
            default: 0,
        },
        text: {
            type: String,
            default: '',
        },
        cloudinaryUrl: {
            type: String,
            default: '',
            trim: true,
        },
    },
    { timestamps: true },
);

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
