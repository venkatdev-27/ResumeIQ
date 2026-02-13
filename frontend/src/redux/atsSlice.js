import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchATSScoreAPI } from '@/api/atsAPI';
import { getErrorMessage, normalizeStringList, resumeFormToText, unwrapApiPayload } from '@/utils/helpers';

export const fetchATSScore = createAsyncThunk('ats/fetchATSScore', async (_payload, { getState, rejectWithValue }) => {
    try {
        const state = getState();
        const resumeText = state.resume.uploadedText || resumeFormToText(state.resume.form);
        const normalizedResumeId =
            typeof state.resume.resumeId === 'string' && state.resume.resumeId.trim()
                ? state.resume.resumeId.trim()
                : undefined;

        if (!resumeText?.trim()) {
            throw new Error('Upload or create a resume before checking ATS score.');
        }

        const payload = {
            resumeText,
            ...(normalizedResumeId ? { resumeId: normalizedResumeId } : {}),
        };

        const response = await fetchATSScoreAPI(payload);
        const data = unwrapApiPayload(response);

        const score = Number(data.score ?? data.atsScore ?? data.matchScore ?? 0);
        const matchedKeywords = normalizeStringList(data.matchedKeywords || data.keywordMatches);
        const missingKeywords = normalizeStringList(data.missingWords || data.missingKeywords || data.keywordGaps);
        const missingSkills = normalizeStringList(data.missingSkills || data.skillGaps);
        const recommendations = normalizeStringList(data.recommendations || data.suggestions || data.improvements);

        return {
            score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
            matchedKeywords,
            missingKeywords,
            missingSkills,
            recommendations,
        };
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, 'Unable to fetch ATS score.'));
    }
});

const atsSlice = createSlice({
    name: 'ats',
    initialState: {
        score: null,
        matchedKeywords: [],
        missingKeywords: [],
        missingSkills: [],
        recommendations: [],
        status: 'idle',
        error: null,
    },
    reducers: {
        clearATSData(state) {
            state.score = null;
            state.matchedKeywords = [];
            state.missingKeywords = [];
            state.missingSkills = [];
            state.recommendations = [];
            state.status = 'idle';
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchATSScore.pending, (state) => {
                state.status = 'loading';
                state.error = null;
                state.missingSkills = [];
            })
            .addCase(fetchATSScore.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.score = action.payload.score;
                state.matchedKeywords = action.payload.matchedKeywords;
                state.missingKeywords = action.payload.missingKeywords;
                state.missingSkills = action.payload.missingSkills;
                state.recommendations = action.payload.recommendations;
            })
            .addCase(fetchATSScore.rejected, (state, action) => {
                state.status = 'failed';
                state.missingSkills = [];
                state.error = action.payload || 'Failed to fetch ATS score.';
            });
    },
});

export const { clearATSData } = atsSlice.actions;
export default atsSlice.reducer;
