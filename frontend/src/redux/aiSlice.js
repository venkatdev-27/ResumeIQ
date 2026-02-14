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

const sanitizeAtsResumeDataForAIRequest = (resumeData = {}) => {
    const safeResumeData = resumeData && typeof resumeData === 'object' ? resumeData : {};
    const personalDetails = safeResumeData.personalDetails || {};

    return {
        personalDetails: {
            title: normalizeText(personalDetails.title, 120),
            summary: normalizeText(personalDetails.summary, 1600),
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
        education: [],
        skills: [],
        certifications: [],
        achievements: [],
        hobbies: [],
    };
};

const normalizeAiPayload = (payload = {}, fallbackScore = null) => {
    const feedback = payload.atsFeedback || {};
    const skills = Array.isArray(payload.skills)
        ? payload.skills.filter((item) => typeof item === 'string' && item.trim())
        : [];

    return {
        summary: typeof payload.summary === 'string' ? payload.summary.trim() : '',
        workExperience: Array.isArray(payload.workExperience) ? payload.workExperience : [],
        projects: Array.isArray(payload.projects) ? payload.projects : [],
        internships: Array.isArray(payload.internships) ? payload.internships : [],
        skills,
        certifications: [],
        achievements: [],
        hobbies: [],
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
        const bulletText = Array.isArray(item?.bullets) ? item.bullets.filter(Boolean).join(' | ') : '';
        const improvedText = item?.improvedDescription || bulletText;
        if (!improvedText) {
            return;
        }
        suggestions.push({
            id: `work-${index}`,
            text: `${item.role || 'Role'} ${item.company ? `at ${item.company}` : ''}: ${improvedText}`,
        });
    });

    improvedResume.projects.forEach((item, index) => {
        const bulletText = Array.isArray(item?.bullets) ? item.bullets.filter(Boolean).join(' | ') : '';
        const improvedText = item?.improvedDescription || bulletText;
        if (!improvedText) {
            return;
        }
        suggestions.push({
            id: `project-${index}`,
            text: `${item.title || 'Project'}: ${improvedText}`,
        });
    });

    improvedResume.internships.forEach((item, index) => {
        const bulletText = Array.isArray(item?.bullets) ? item.bullets.filter(Boolean).join(' | ') : '';
        const improvedText = item?.improvedDescription || bulletText;
        if (!improvedText) {
            return;
        }
        suggestions.push({
            id: `internship-${index}`,
            text: `${item.company || 'Internship'}: ${improvedText}`,
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
    async ({ jobDescription, atsContext = null } = {}, { getState, rejectWithValue }) => {
        try {
            const state = getState();
            const uploadedText = typeof state.resume.uploadedText === 'string' ? state.resume.uploadedText : '';
            const hasUploadedPdfContext = Boolean(
                state.resume.uploadedFile?.name ||
                String(state.resume.cloudinaryUrl || '').trim(),
            );
            const normalizedResumeId =
                typeof state.resume.resumeId === 'string' && state.resume.resumeId.trim()
                    ? state.resume.resumeId.trim()
                    : undefined;
            const resumeData = state.resume.resumeData;
            const sanitizedResumeData = sanitizeAtsResumeDataForAIRequest(resumeData);
            const safeAtsContext = atsContext && typeof atsContext === 'object' ? atsContext : {};
            const atsScore = safeAtsContext.score ?? state.ats.score;
            const matchedKeywords = normalizeList(
                Array.isArray(safeAtsContext.matchedKeywords)
                    ? safeAtsContext.matchedKeywords
                    : state.ats.matchedKeywords || [],
                60,
            );
            const missingKeywords = normalizeList(
                Array.isArray(safeAtsContext.missingKeywords)
                    ? safeAtsContext.missingKeywords
                    : state.ats.missingKeywords || [],
                60,
            );
            const missingSkills = normalizeList(
                Array.isArray(safeAtsContext.missingSkills)
                    ? safeAtsContext.missingSkills
                    : state.ats.missingSkills || [],
                60,
            );

            if (!hasUploadedPdfContext) {
                throw new Error('Upload a resume PDF in ATS Scanner before requesting AI improvements.');
            }

            if (!uploadedText.trim() && !normalizedResumeId) {
                throw new Error('Uploaded resume text is unavailable. Re-upload the PDF and try again.');
            }

            const payload = {
                mode: 'ats_only',
                jobDescription,
                resumeText: uploadedText,
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
