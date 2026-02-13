import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchAISuggestionsAPI } from '@/api/aiAPI';
import { getErrorMessage, unwrapApiPayload } from '@/utils/helpers';

const normalizeText = (value, max = 1200) =>
    String(value || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim()
        .slice(0, max);

const normalizeList = (values = [], max = 30) => {
    const seen = new Set();

    return (Array.isArray(values) ? values : [])
        .map((item) => normalizeText(item, 160))
        .filter((item) => {
            if (!item) {
                return false;
            }
            const key = item.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        })
        .slice(0, max);
};

const hasAnyText = (...values) => values.some((value) => Boolean(String(value || '').trim()));

const sanitizeResumeDataForAIRequest = (resumeData = {}) => {
    const safeResumeData = resumeData && typeof resumeData === 'object' ? resumeData : {};
    const personalDetails = safeResumeData.personalDetails || {};

    return {
        personalDetails: {
            fullName: normalizeText(personalDetails.fullName, 120),
            email: normalizeText(personalDetails.email, 180),
            phone: normalizeText(personalDetails.phone, 60),
            location: normalizeText(personalDetails.location, 120),
            title: normalizeText(personalDetails.title, 120),
            summary: normalizeText(personalDetails.summary, 1600),
            linkedin: normalizeText(personalDetails.linkedin, 220),
            website: normalizeText(personalDetails.website, 220),
        },
        workExperience: (Array.isArray(safeResumeData.workExperience) ? safeResumeData.workExperience : [])
            .map((item = {}) => ({
                company: normalizeText(item.company, 160),
                role: normalizeText(item.role, 160),
                startDate: normalizeText(item.startDate, 40),
                endDate: normalizeText(item.endDate, 40),
                description: normalizeText(item.description, 1800),
            }))
            .filter((item) => hasAnyText(item.company, item.role, item.startDate, item.endDate, item.description))
            .slice(0, 30),
        projects: (Array.isArray(safeResumeData.projects) ? safeResumeData.projects : [])
            .map((item = {}) => ({
                name: normalizeText(item.name, 180),
                techStack: normalizeText(item.techStack, 500),
                link: normalizeText(item.link, 260),
                description: normalizeText(item.description, 1600),
            }))
            .filter((item) => hasAnyText(item.name, item.techStack, item.link, item.description))
            .slice(0, 30),
        internships: (Array.isArray(safeResumeData.internships) ? safeResumeData.internships : [])
            .map((item = {}) => ({
                company: normalizeText(item.company, 160),
                role: normalizeText(item.role, 160),
                startDate: normalizeText(item.startDate, 40),
                endDate: normalizeText(item.endDate, 40),
                description: normalizeText(item.description, 1600),
            }))
            .filter((item) => hasAnyText(item.company, item.role, item.startDate, item.endDate, item.description))
            .slice(0, 20),
        education: (Array.isArray(safeResumeData.education) ? safeResumeData.education : [])
            .map((item = {}) => ({
                institution: normalizeText(item.institution, 180),
                degree: normalizeText(item.degree, 220),
                startYear: normalizeText(item.startYear, 40),
                endYear: normalizeText(item.endYear, 40),
                description: normalizeText(item.description, 500),
            }))
            .filter((item) => hasAnyText(item.institution, item.degree, item.startYear, item.endYear, item.description))
            .slice(0, 20),
        skills: normalizeList(safeResumeData.skills, 25),
        certifications: normalizeList(safeResumeData.certifications, 25),
        achievements: normalizeList(safeResumeData.achievements, 25),
        hobbies: normalizeList(safeResumeData.hobbies, 25),
    };
};

const normalizeAiPayload = (payload = {}, fallbackScore = null) => {
    const skills = Array.isArray(payload.skills) ? payload.skills.filter((item) => typeof item === 'string' && item.trim()) : [];
    const feedback = payload.atsFeedback || {};

    return {
        summary: typeof payload.summary === 'string' ? payload.summary.trim() : '',
        workExperience: Array.isArray(payload.workExperience) ? payload.workExperience : [],
        projects: Array.isArray(payload.projects) ? payload.projects : [],
        internships: Array.isArray(payload.internships) ? payload.internships : [],
        skills,
        atsFeedback: {
            currentScore: feedback.currentScore ?? fallbackScore ?? '',
            whyScoreIsLower: Array.isArray(feedback.whyScoreIsLower) ? feedback.whyScoreIsLower : [],
            missingKeywords: Array.isArray(feedback.missingKeywords) ? feedback.missingKeywords : [],
            missingSkills: Array.isArray(feedback.missingSkills) ? feedback.missingSkills : [],
            improvementSteps: Array.isArray(feedback.improvementSteps) ? feedback.improvementSteps : [],
        },
    };
};

const toSuggestions = (improvedResume) => {
    const suggestions = [];

    if (improvedResume.summary) {
        suggestions.push({ id: 'summary-0', text: `Summary: ${improvedResume.summary}` });
    }

    improvedResume.workExperience.forEach((item, index) => {
        if (!item?.improvedDescription) {
            return;
        }
        suggestions.push({
            id: `work-${index}`,
            text: `${item.role || 'Role'} ${item.company ? `at ${item.company}` : ''}: ${item.improvedDescription}`,
        });
    });

    improvedResume.projects.forEach((item, index) => {
        if (!item?.improvedDescription) {
            return;
        }
        suggestions.push({
            id: `project-${index}`,
            text: `${item.title || 'Project'}: ${item.improvedDescription}`,
        });
    });

    improvedResume.internships.forEach((item, index) => {
        if (!item?.improvedDescription) {
            return;
        }
        suggestions.push({
            id: `internship-${index}`,
            text: `${item.company || 'Internship'}: ${item.improvedDescription}`,
        });
    });

    improvedResume.atsFeedback.improvementSteps.forEach((step, index) => {
        suggestions.push({
            id: `step-${index}`,
            text: `Step ${index + 1}: ${step}`,
        });
    });

    return suggestions;
};

export const fetchAISuggestions = createAsyncThunk(
    'ai/fetchAISuggestions',
    async ({ jobDescription }, { getState, rejectWithValue }) => {
        try {
            const state = getState();
            const normalizedResumeId =
                typeof state.resume.resumeId === 'string' && state.resume.resumeId.trim()
                    ? state.resume.resumeId.trim()
                    : undefined;
            const resumeData = state.resume.resumeData;
            const sanitizedResumeData = sanitizeResumeDataForAIRequest(resumeData);
            const atsScore = state.ats.score;
            const matchedKeywords = state.ats.matchedKeywords || [];
            const missingKeywords = state.ats.missingKeywords || [];
            const missingSkills = state.ats.missingSkills || [];

            if (!resumeData || typeof resumeData !== 'object') {
                throw new Error('Resume data is required before requesting AI suggestions.');
            }

            const payload = {
                jobDescription,
                resumeData: sanitizedResumeData,
                atsScore,
                matchedKeywords,
                missingKeywords,
                missingSkills,
                ...(normalizedResumeId ? { resumeId: normalizedResumeId } : {}),
            };

            const response = await fetchAISuggestionsAPI(payload);

            const data = unwrapApiPayload(response);
            const improvedResume = normalizeAiPayload(data, atsScore);
            const suggestions = toSuggestions(improvedResume);

            return { suggestions, improvedResume };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'Unable to generate AI suggestions.'));
        }
    },
);

const aiSlice = createSlice({
    name: 'ai',
    initialState: {
        suggestions: [],
        improvedResume: null,
        status: 'idle',
        error: null,
    },
    reducers: {
        clearAISuggestions(state) {
            state.suggestions = [];
            state.improvedResume = null;
            state.status = 'idle';
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAISuggestions.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchAISuggestions.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.suggestions = action.payload.suggestions;
                state.improvedResume = action.payload.improvedResume;
            })
            .addCase(fetchAISuggestions.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'Failed to fetch AI suggestions.';
            });
    },
});

export const { clearAISuggestions } = aiSlice.actions;
export default aiSlice.reducer;
