import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { saveResumeBuilderAPI, uploadResumeAPI } from '@/api/resumeAPI';
import { improveResumeContentAPI } from '@/api/aiAPI';
import { DEFAULT_RESUME_FORM, TEMPLATE_TYPES, createEmptyResumeData } from '@/utils/constants';
import {
    formToResumeData,
    getErrorMessage,
    mapParsedResumeToForm,
    resumeDataToForm,
    resumeFormToText,
    unwrapApiPayload,
} from '@/utils/helpers';

const arraySections = new Set([
    'workExperience',
    'projects',
    'internships',
    'education',
    'skills',
    'certifications',
    'achievements',
    'hobbies',
]);

const syncFormFromResumeData = (state) => {
    state.form = resumeDataToForm(state.resumeData);
};

const clearEnhancedResume = (state) => {
    state.enhancedResume = null;
};

const normalizeTemplateName = (templateName) => {
    if (!templateName) {
        return TEMPLATE_TYPES.template1;
    }
    const value = String(templateName);
    return TEMPLATE_TYPES[value] || value;
};

const mergeResumeData = (payload = {}) => {
    const base = createEmptyResumeData();
    return {
        ...base,
        ...payload,
        personalDetails: {
            ...base.personalDetails,
            ...(payload.personalDetails || {}),
        },
        workExperience: payload.workExperience || base.workExperience,
        projects: payload.projects || base.projects,
        internships: payload.internships || base.internships,
        education: payload.education || base.education,
        skills: payload.skills || base.skills,
        certifications: payload.certifications || base.certifications,
        achievements: payload.achievements || base.achievements,
        hobbies: payload.hobbies || base.hobbies,
    };
};

const normalizeImprovedText = (value) =>
    String(value || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();

const normalizeSimpleText = (value) => String(value || '').trim();

const hasAnyText = (...values) => values.some((value) => Boolean(String(value || '').trim()));

const hasMeaningfulWorkEntry = (entry = {}) =>
    hasAnyText(entry.company, entry.role, entry.startDate, entry.endDate, entry.description);

const hasMeaningfulProjectEntry = (entry = {}) =>
    hasAnyText(entry.name, entry.techStack, entry.link, entry.description);

const hasMeaningfulInternshipEntry = (entry = {}) =>
    hasAnyText(entry.company, entry.role, entry.startDate, entry.endDate, entry.description);

const hasMeaningfulEducationEntry = (entry = {}) =>
    hasAnyText(entry.institution, entry.degree, entry.startYear, entry.endYear, entry.description);

const normalizeUniqueStrings = (values = [], max = 20) => {
    const seen = new Set();

    return (Array.isArray(values) ? values : [])
        .map((value) => normalizeSimpleText(value))
        .filter((value) => {
            if (!value) {
                return false;
            }

            const key = value.toLowerCase();
            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        })
        .slice(0, max);
};

const normalizeBulletLine = (value) =>
    String(value || '')
        .replace(/^[\u2022*-]+\s*/g, '')
        .trim();

const normalizeBullets = (value, max = 3) =>
    (Array.isArray(value) ? value : [])
        .map((item) => normalizeBulletLine(item))
        .filter(Boolean)
        .slice(0, max);

const multilineFromBullets = (bullets = []) => normalizeBullets(bullets).join('\n');

const textToBullets = (value = '', max = 3) =>
    String(value || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((item) => normalizeBulletLine(item))
        .filter(Boolean)
        .slice(0, max);

const sanitizeResumeDataForAI = (resumeData = {}) => {
    const safeResumeData = resumeData && typeof resumeData === 'object' ? resumeData : {};
    const personalDetails = safeResumeData.personalDetails || {};

    return {
        personalDetails: {
            fullName: normalizeSimpleText(personalDetails.fullName),
            email: normalizeSimpleText(personalDetails.email),
            phone: normalizeSimpleText(personalDetails.phone),
            location: normalizeSimpleText(personalDetails.location),
            title: normalizeSimpleText(personalDetails.title),
            summary: normalizeImprovedText(personalDetails.summary),
            linkedin: normalizeSimpleText(personalDetails.linkedin),
            website: normalizeSimpleText(personalDetails.website),
            photo: normalizeSimpleText(personalDetails.photo),
        },
        workExperience: (safeResumeData.workExperience || [])
            .map((item = {}) => ({
                company: normalizeSimpleText(item.company),
                role: normalizeSimpleText(item.role),
                startDate: normalizeSimpleText(item.startDate),
                endDate: normalizeSimpleText(item.endDate),
                description: normalizeImprovedText(item.description),
            }))
            .filter(hasMeaningfulWorkEntry),
        projects: (safeResumeData.projects || [])
            .map((item = {}) => ({
                name: normalizeSimpleText(item.name),
                techStack: normalizeSimpleText(item.techStack),
                link: normalizeSimpleText(item.link),
                description: normalizeImprovedText(item.description),
            }))
            .filter(hasMeaningfulProjectEntry),
        internships: (safeResumeData.internships || [])
            .map((item = {}) => ({
                company: normalizeSimpleText(item.company),
                role: normalizeSimpleText(item.role),
                startDate: normalizeSimpleText(item.startDate),
                endDate: normalizeSimpleText(item.endDate),
                description: normalizeImprovedText(item.description),
            }))
            .filter(hasMeaningfulInternshipEntry),
        education: (safeResumeData.education || [])
            .map((item = {}) => ({
                institution: normalizeSimpleText(item.institution),
                degree: normalizeSimpleText(item.degree),
                startYear: normalizeSimpleText(item.startYear),
                endYear: normalizeSimpleText(item.endYear),
                description: normalizeImprovedText(item.description),
            }))
            .filter(hasMeaningfulEducationEntry),
        skills: normalizeUniqueStrings(safeResumeData.skills, 20),
        certifications: normalizeUniqueStrings(safeResumeData.certifications, 30),
        achievements: normalizeUniqueStrings(safeResumeData.achievements, 30),
        hobbies: normalizeUniqueStrings(safeResumeData.hobbies, 30),
    };
};

const applySequentialDescriptionImprovements = ({ entries = [], improvedEntries = [], hasMeaningfulEntry }) => {
    let improvedIndex = 0;

    return entries.map((entry) => {
        if (!hasMeaningfulEntry(entry)) {
            return entry;
        }

        const aiEntry = improvedEntries[improvedIndex] || {};
        improvedIndex += 1;

        const bullets = normalizeBullets(aiEntry.bullets);
        const fallbackBullets = textToBullets(aiEntry.improvedDescription || aiEntry.description || '');
        const finalBullets = bullets.length ? bullets : fallbackBullets;

        if (!finalBullets.length) {
            return entry;
        }

        return {
            ...entry,
            description: multilineFromBullets(finalBullets),
        };
    });
};

const applyAiImprovementsToResume = (resumeData, improved) => {
    const next = mergeResumeData(resumeData);

    if (improved?.summary) {
        next.personalDetails.summary = normalizeImprovedText(improved.summary);
    }

    if (Array.isArray(improved?.workExperience) && improved.workExperience.length) {
        next.workExperience = applySequentialDescriptionImprovements({
            entries: next.workExperience,
            improvedEntries: improved.workExperience,
            hasMeaningfulEntry: hasMeaningfulWorkEntry,
        });
    }

    if (Array.isArray(improved?.projects) && improved.projects.length) {
        next.projects = applySequentialDescriptionImprovements({
            entries: next.projects,
            improvedEntries: improved.projects,
            hasMeaningfulEntry: hasMeaningfulProjectEntry,
        });
    }

    if (Array.isArray(improved?.internships) && improved.internships.length) {
        next.internships = applySequentialDescriptionImprovements({
            entries: next.internships,
            improvedEntries: improved.internships,
            hasMeaningfulEntry: hasMeaningfulInternshipEntry,
        });
    }

    if (Array.isArray(improved?.skills) && improved.skills.length) {
        next.skills = normalizeUniqueStrings(improved.skills, 20);
    }

    if (Array.isArray(improved?.achievements) && improved.achievements.length) {
        next.achievements = normalizeUniqueStrings(improved.achievements, 20);
    }

    if (Array.isArray(improved?.hobbies) && improved.hobbies.length) {
        next.hobbies = normalizeUniqueStrings(improved.hobbies, 20);
    }

    return next;
};

export const uploadResumePDF = createAsyncThunk('resume/uploadResumePDF', async (file, { getState, rejectWithValue }) => {
    try {
        if (!file) {
            throw new Error('Please select a resume PDF file.');
        }

        const state = getState();
        const resumeText = resumeFormToText(state.resume.form);

        const response = await uploadResumeAPI(file, {
            resumeText,
            templateName: state.resume.template,
            resumeData: state.resume.resumeData,
        });
        const data = unwrapApiPayload(response);

        const parsed = data.parsedResume || data.parsedData || data.resume || data.extractedData || {};
        const mappedForm = mapParsedResumeToForm(parsed);
        const mappedResumeData = mergeResumeData(data.resumeData || formToResumeData(mappedForm));
        const uploadedText =
            data.resumeText ||
            data.parsedText ||
            data.text ||
            data.content ||
            resumeFormToText(mappedForm);

        return {
            file: {
                name: file.name,
                size: file.size,
                type: file.type,
            },
            resumeId: data.resumeId || data.id || null,
            cloudinaryUrl: data.cloudinaryUrl || '',
            uploadedText: uploadedText || '',
            mappedForm,
            mappedResumeData,
            templateName: normalizeTemplateName(data.templateName),
        };
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, 'Resume upload failed.'));
    }
});

export const saveResumeBuilder = createAsyncThunk('resume/saveResumeBuilder', async (_payload, { getState, rejectWithValue }) => {
    try {
        const state = getState();
        const { template, resumeData, enhancedResume } = state.resume;
        const effectiveResumeData =
            enhancedResume && typeof enhancedResume === 'object'
                ? enhancedResume
                : resumeData;
        const resumeText = resumeFormToText(resumeDataToForm(effectiveResumeData));

        const response = await saveResumeBuilderAPI({
            templateName: template,
            resumeData: effectiveResumeData,
            resumeText,
        });
        const data = unwrapApiPayload(response);

        return {
            resumeId: data.resumeId || data.id || null,
            templateName: normalizeTemplateName(data.templateName || template),
            resumeData: mergeResumeData(data.resumeData || effectiveResumeData),
            uploadedText: data.parsedText || data.text || resumeText,
        };
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, 'Failed to save resume data.'));
    }
});

export const enhanceResumeWithAI = createAsyncThunk('resume/enhanceResumeWithAI', async (_payload, { getState, rejectWithValue }) => {
    try {
        const state = getState();
        const normalizedResumeId =
            typeof state.resume.resumeId === 'string' && state.resume.resumeId.trim()
                ? state.resume.resumeId.trim()
                : undefined;
        const resumeData = state.resume.resumeData;
        const sanitizedResumeData = sanitizeResumeDataForAI(resumeData);

        if (!resumeData || typeof resumeData !== 'object') {
            throw new Error('Resume data is required.');
        }

        const hasContent =
            Boolean(sanitizedResumeData.personalDetails?.summary) ||
            Boolean(sanitizedResumeData.personalDetails?.title) ||
            sanitizedResumeData.workExperience.length > 0 ||
            sanitizedResumeData.projects.length > 0 ||
            sanitizedResumeData.internships.length > 0 ||
            sanitizedResumeData.skills.length > 0 ||
            sanitizedResumeData.achievements.length > 0 ||
            sanitizedResumeData.hobbies.length > 0;

        if (!hasContent) {
            throw new Error('Please fill at least summary, experience, project, or internship details before AI enhancement.');
        }

        const payload = {
            resumeData: sanitizedResumeData,
            ...(normalizedResumeId ? { resumeId: normalizedResumeId } : {}),
        };

        const response = await improveResumeContentAPI(payload);

        const improved = unwrapApiPayload(response);
        const updatedResumeData = applyAiImprovementsToResume(resumeData, improved);

        return {
            improvedResume: improved,
            enhancedResume: updatedResumeData,
        };
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, 'Unable to enhance resume content.'));
    }
});

const initialResumeData = createEmptyResumeData();

const resumeSlice = createSlice({
    name: 'resume',
    initialState: {
        form: { ...DEFAULT_RESUME_FORM, ...resumeDataToForm(initialResumeData) },
        resumeData: initialResumeData,
        enhancedResume: null,
        template: TEMPLATE_TYPES.template1,
        uploadedFile: null,
        uploadedText: '',
        resumeId: null,
        cloudinaryUrl: '',
        uploadStatus: 'idle',
        uploadError: null,
        saveStatus: 'idle',
        saveError: null,
        improveStatus: 'idle',
        improveError: null,
    },
    reducers: {
        setTemplate(state, action) {
            state.template = normalizeTemplateName(action.payload);
        },
        setSelectedTemplate(state, action) {
            state.template = normalizeTemplateName(action.payload);
        },
        setResumeField(state, action) {
            const { field, value } = action.payload;
            state.form[field] = value;

            if (field in state.resumeData.personalDetails) {
                state.resumeData.personalDetails[field] = value;
            }

            if (field === 'skills') {
                state.resumeData.skills = String(value)
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean);
            }

            if (field === 'experience') {
                state.resumeData.workExperience = String(value)
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((description) => ({
                        company: '',
                        role: '',
                        startDate: '',
                        endDate: '',
                        description,
                    }));
            }

            if (field === 'education') {
                state.resumeData.education = String(value)
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((description) => ({
                        institution: '',
                        degree: '',
                        startYear: '',
                        endYear: '',
                        description,
                    }));
            }

            clearEnhancedResume(state);
        },
        updateResumeSection(state, action) {
            const { section, value, index, item, operation = 'set' } = action.payload;

            if (!section) {
                return;
            }

            if (!arraySections.has(section) && section !== 'personalDetails') {
                return;
            }

            clearEnhancedResume(state);

            if (section === 'personalDetails') {
                state.resumeData.personalDetails = {
                    ...state.resumeData.personalDetails,
                    ...(value || {}),
                };
                syncFormFromResumeData(state);
                return;
            }

            const currentValue = state.resumeData[section] || [];

            if (operation === 'add') {
                state.resumeData[section] = [...currentValue, item];
                syncFormFromResumeData(state);
                return;
            }

            if (operation === 'remove') {
                state.resumeData[section] = currentValue.filter((_entry, entryIndex) => entryIndex !== index);
                syncFormFromResumeData(state);
                return;
            }

            if (typeof index === 'number') {
                state.resumeData[section] = currentValue.map((entry, entryIndex) =>
                    entryIndex === index
                        ? typeof item === 'object' && item !== null
                            ? { ...entry, ...item }
                            : item
                        : entry,
                );
                syncFormFromResumeData(state);
                return;
            }

            state.resumeData[section] = value;
            syncFormFromResumeData(state);
        },
        setResumeForm(state, action) {
            const payload = action.payload || {};

            if (payload.resumeData) {
                state.resumeData = mergeResumeData(payload.resumeData);
                state.template = normalizeTemplateName(payload.template || state.template);
                syncFormFromResumeData(state);
                clearEnhancedResume(state);
                return;
            }

            if (payload.template) {
                state.template = normalizeTemplateName(payload.template);
            }
            state.form = { ...state.form, ...payload };
            state.resumeData = mergeResumeData(formToResumeData(state.form));
            clearEnhancedResume(state);
        },
        clearResumeData(state) {
            const emptyData = createEmptyResumeData();
            state.form = resumeDataToForm(emptyData);
            state.resumeData = emptyData;
            state.enhancedResume = null;
            state.template = TEMPLATE_TYPES.template1;
            state.uploadedFile = null;
            state.uploadedText = '';
            state.resumeId = null;
            state.cloudinaryUrl = '';
            state.uploadStatus = 'idle';
            state.uploadError = null;
            state.saveStatus = 'idle';
            state.saveError = null;
            state.improveStatus = 'idle';
            state.improveError = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(uploadResumePDF.pending, (state) => {
                state.uploadStatus = 'loading';
                state.uploadError = null;
            })
            .addCase(uploadResumePDF.fulfilled, (state, action) => {
                state.uploadStatus = 'succeeded';
                state.uploadedFile = action.payload.file;
                state.uploadedText = action.payload.uploadedText;
                state.resumeId = action.payload.resumeId;
                state.cloudinaryUrl = action.payload.cloudinaryUrl;
                state.form = { ...state.form, ...action.payload.mappedForm };
                state.resumeData = action.payload.mappedResumeData;
                state.template = action.payload.templateName || state.template;
                state.enhancedResume = null;
            })
            .addCase(uploadResumePDF.rejected, (state, action) => {
                state.uploadStatus = 'failed';
                state.uploadError = action.payload || 'Upload failed.';
            })
            .addCase(saveResumeBuilder.pending, (state) => {
                state.saveStatus = 'loading';
                state.saveError = null;
            })
            .addCase(saveResumeBuilder.fulfilled, (state, action) => {
                state.saveStatus = 'succeeded';
                state.resumeId = action.payload.resumeId;
                state.template = action.payload.templateName || state.template;
                state.resumeData = action.payload.resumeData;
                state.uploadedText = action.payload.uploadedText || state.uploadedText;
                syncFormFromResumeData(state);
            })
            .addCase(saveResumeBuilder.rejected, (state, action) => {
                state.saveStatus = 'failed';
                state.saveError = action.payload || 'Failed to save resume.';
            })
            .addCase(enhanceResumeWithAI.pending, (state) => {
                state.improveStatus = 'loading';
                state.improveError = null;
            })
            .addCase(enhanceResumeWithAI.fulfilled, (state, action) => {
                state.improveStatus = 'succeeded';
                state.improveError = null;
                state.enhancedResume = action.payload.enhancedResume || null;
            })
            .addCase(enhanceResumeWithAI.rejected, (state, action) => {
                state.improveStatus = 'failed';
                state.improveError = action.payload || 'Unable to enhance resume content.';
            });
    },
});

export const {
    setTemplate,
    setSelectedTemplate,
    setResumeField,
    updateResumeSection,
    setResumeForm,
    clearResumeData,
} = resumeSlice.actions;
export default resumeSlice.reducer;
