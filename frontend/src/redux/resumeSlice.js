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
    state.liveSummaryStatus = 'idle';
    state.liveSummaryError = null;
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

const normalizeSimpleText = (value) =>
    String(value || '')
        .replace(/\r\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const LIVE_PREVIEW_SUMMARY_MIN_WORDS = 45;
const LIVE_PREVIEW_SUMMARY_MAX_WORDS = 47;

const countSummaryWords = (value = '') =>
    String(value || '')
        .match(/[A-Za-z0-9+#./-]+/g)?.length || 0;

const normalizeLivePreviewSummaryText = (value = '') => {
    const normalized = normalizeSimpleText(value)
        .replace(/^[\u2022*-]+\s*/g, '')
        .trim();

    if (!normalized) {
        return '';
    }

    const words = String(normalized)
        .split(/\s+/)
        .filter(Boolean);
    const withinLimit = words.slice(0, LIVE_PREVIEW_SUMMARY_MAX_WORDS).join(' ').trim();
    const withSentenceEnding = withinLimit ? (/[\.\!\?]$/.test(withinLimit) ? withinLimit : `${withinLimit}.`) : '';
    const wordCount = countSummaryWords(withSentenceEnding);

    if (wordCount < LIVE_PREVIEW_SUMMARY_MIN_WORDS) {
        return '';
    }

    return withSentenceEnding;
};

const normalizeSummaryToFourLines = (value = '') => {
    const lines = String(value || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const sentenceSplit = String(value || '')
        .replace(/\r\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\n/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map((line) => line.trim())
        .filter(Boolean);

    const merged = [];
    const pushUnique = (item) => {
        const text = normalizeSimpleText(item);
        if (!text) {
            return;
        }
        if (!merged.some((line) => line.toLowerCase() === text.toLowerCase())) {
            merged.push(text);
        }
    };

    lines.forEach(pushUnique);
    sentenceSplit.forEach(pushUnique);
    String(value || '')
        .replace(/\r\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\n/g, ' ')
        .split(/[,;]\s+/)
        .forEach(pushUnique);

    if (!merged.length) {
        return '';
    }

    const fixed = [...merged];
    const seed = [...merged];
    let index = 0;
    while (fixed.length < 4 && seed.length) {
        fixed.push(seed[index % seed.length]);
        index += 1;
    }

    return fixed.slice(0, 4).join('\n');
};

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

const buildLivePreviewSourceSignature = (resumeData = {}) => {
    const safeResumeData = resumeData && typeof resumeData === 'object' ? resumeData : {};
    const title = normalizeSimpleText(safeResumeData?.personalDetails?.title || '').toLowerCase();
    const work = (Array.isArray(safeResumeData.workExperience) ? safeResumeData.workExperience : [])
        .map((item = {}) =>
            [
                normalizeSimpleText(item.role),
                normalizeSimpleText(item.company),
                normalizeImprovedText(item.description),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase(),
        )
        .filter(Boolean)
        .slice(0, 12);
    const projects = (Array.isArray(safeResumeData.projects) ? safeResumeData.projects : [])
        .map((item = {}) =>
            [
                normalizeSimpleText(item.name),
                normalizeImprovedText(item.description),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase(),
        )
        .filter(Boolean)
        .slice(0, 12);
    const internships = (Array.isArray(safeResumeData.internships) ? safeResumeData.internships : [])
        .map((item = {}) =>
            [
                normalizeSimpleText(item.role),
                normalizeSimpleText(item.company),
                normalizeImprovedText(item.description),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase(),
        )
        .filter(Boolean)
        .slice(0, 12);

    return [title, ...work, ...projects, ...internships].join('|').trim();
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

const ensureThreeBullets = (value = []) => {
    const base = normalizeBullets(value, 6);
    const expanded = base.flatMap((line) =>
        String(line || '')
            .split(/[,;]\s+/)
            .map((part) => normalizeBulletLine(part))
            .filter(Boolean),
    );
    const merged = [];
    const pushUnique = (item) => {
        const text = normalizeBulletLine(item);
        if (!text) {
            return;
        }
        if (!merged.some((line) => line.toLowerCase() === text.toLowerCase())) {
            merged.push(text);
        }
    };

    base.forEach(pushUnique);
    expanded.forEach(pushUnique);

    if (!merged.length) {
        return [];
    }

    const fixed = [...merged];
    const seed = [...merged];
    let index = 0;
    while (fixed.length < 3 && seed.length) {
        fixed.push(seed[index % seed.length]);
        index += 1;
    }

    return fixed.slice(0, 3);
};

const GLOBAL_BULLET_START_VERBS = [
    'Engineered',
    'Optimized',
    'Implemented',
    'Orchestrated',
    'Streamlined',
    'Architected',
    'Automated',
    'Strengthened',
    'Elevated',
    'Delivered',
    'Validated',
    'Enhanced',
];

const GLOBAL_BULLET_END_WORDS = [
    'excellence',
    'precision',
    'reliability',
    'scalability',
    'efficiency',
    'resilience',
    'maintainability',
    'consistency',
    'stability',
    'readiness',
];

const normalizeBulletUniquenessKey = (value = '') =>
    normalizeSimpleText(String(value || '').replace(/[.!?]+$/g, '')).toLowerCase();

const ensureBulletSentence = (value = '') => {
    const line = normalizeSimpleText(value);
    if (!line) {
        return '';
    }
    return /[.!?]$/.test(line) ? line : `${line}.`;
};

const getBulletBoundaryKey = (value = '', side = 'first') => {
    const words = normalizeSimpleText(String(value || '').replace(/[.!?]+$/g, ''))
        .split(' ')
        .map((token) => token.trim().toLowerCase().replace(/[^a-z0-9%-]/g, ''))
        .filter(Boolean);
    if (!words.length) {
        return '';
    }
    return side === 'last' ? words[words.length - 1] : words[0];
};

const enforceGlobalUniqueBullets = ({ bullets = [], state, context = '' }) => {
    const uniquenessState = state || {
        lineKeys: new Set(),
        startKeys: new Set(),
        endKeys: new Set(),
        cursor: 0,
    };

    return (Array.isArray(bullets) ? bullets : []).map((line, index) => {
        let candidate = ensureBulletSentence(line);
        let key = normalizeBulletUniquenessKey(candidate);
        let startKey = getBulletBoundaryKey(candidate, 'first');
        let endKey = getBulletBoundaryKey(candidate, 'last');
        let attempts = 0;

        while (
            (!key ||
                uniquenessState.lineKeys.has(key) ||
                !startKey ||
                !endKey ||
                uniquenessState.startKeys.has(startKey) ||
                uniquenessState.endKeys.has(endKey)) &&
            attempts < 10
        ) {
            const plain = normalizeSimpleText(candidate.replace(/[.!?]+$/g, ''));
            const words = plain.split(' ').filter(Boolean);
            if (!words.length) {
                break;
            }

            if (attempts % 2 === 0) {
                const verb = GLOBAL_BULLET_START_VERBS[(uniquenessState.cursor + attempts + index) % GLOBAL_BULLET_START_VERBS.length];
                words[0] = verb;
            } else {
                const ending = GLOBAL_BULLET_END_WORDS[(uniquenessState.cursor + attempts + index) % GLOBAL_BULLET_END_WORDS.length];
                words[words.length - 1] = ending;
            }

            if (attempts >= 6 && context) {
                words.push(context.toLowerCase());
            }

            candidate = ensureBulletSentence(words.join(' '));
            key = normalizeBulletUniquenessKey(candidate);
            startKey = getBulletBoundaryKey(candidate, 'first');
            endKey = getBulletBoundaryKey(candidate, 'last');
            attempts += 1;
        }

        if (key) {
            uniquenessState.lineKeys.add(key);
        }
        if (startKey) {
            uniquenessState.startKeys.add(startKey);
        }
        if (endKey) {
            uniquenessState.endKeys.add(endKey);
        }
        uniquenessState.cursor += 1;

        return candidate;
    });
};

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

const applySequentialDescriptionImprovements = ({
    entries = [],
    improvedEntries = [],
    hasMeaningfulEntry,
    uniquenessState,
    sectionName = '',
    getEntryContext = () => '',
}) => {
    let improvedIndex = 0;

    return entries.map((entry, entryIndex) => {
        if (!hasMeaningfulEntry(entry)) {
            return entry;
        }

        const aiEntry = improvedEntries[improvedIndex] || {};
        improvedIndex += 1;

        const bullets = normalizeBullets(aiEntry.bullets);
        const fallbackBullets = textToBullets(aiEntry.improvedDescription || aiEntry.description || '');
        const finalBullets = ensureThreeBullets(bullets.length ? bullets : fallbackBullets);
        const globallyUniqueBullets = enforceGlobalUniqueBullets({
            bullets: finalBullets,
            state: uniquenessState,
            context: normalizeSimpleText(`${sectionName} ${getEntryContext(entry, entryIndex)}`),
        });

        if (!globallyUniqueBullets.length) {
            return entry;
        }

        return {
            ...entry,
            description: multilineFromBullets(globallyUniqueBullets),
        };
    });
};

const applyAiImprovementsToResume = (resumeData, improved) => {
    const next = mergeResumeData(resumeData);
    const uniquenessState = {
        lineKeys: new Set(),
        startKeys: new Set(),
        endKeys: new Set(),
        cursor: 0,
    };

    if (improved?.summary) {
        next.personalDetails.summary = normalizeSummaryToFourLines(improved.summary);
    }

    if (Array.isArray(improved?.workExperience) && improved.workExperience.length) {
        next.workExperience = applySequentialDescriptionImprovements({
            entries: next.workExperience,
            improvedEntries: improved.workExperience,
            hasMeaningfulEntry: hasMeaningfulWorkEntry,
            uniquenessState,
            sectionName: 'experience',
            getEntryContext: (entry = {}) => `${entry.role || ''} ${entry.company || ''}`.trim(),
        });
    }

    if (Array.isArray(improved?.projects) && improved.projects.length) {
        next.projects = applySequentialDescriptionImprovements({
            entries: next.projects,
            improvedEntries: improved.projects,
            hasMeaningfulEntry: hasMeaningfulProjectEntry,
            uniquenessState,
            sectionName: 'project',
            getEntryContext: (entry = {}) => `${entry.name || ''}`.trim(),
        });
    }

    if (Array.isArray(improved?.internships) && improved.internships.length) {
        next.internships = applySequentialDescriptionImprovements({
            entries: next.internships,
            improvedEntries: improved.internships,
            hasMeaningfulEntry: hasMeaningfulInternshipEntry,
            uniquenessState,
            sectionName: 'internship',
            getEntryContext: (entry = {}) => `${entry.role || ''} ${entry.company || ''}`.trim(),
        });
    }

    if (Array.isArray(improved?.skills) && improved.skills.length) {
        next.skills = normalizeUniqueStrings(improved.skills, 20);
    }

    if (Array.isArray(improved?.certifications) && improved.certifications.length) {
        next.certifications = normalizeUniqueStrings(improved.certifications, 20);
    }

    if (Array.isArray(improved?.achievements) && improved.achievements.length) {
        next.achievements = normalizeUniqueStrings(improved.achievements, 20);
    }

    if (Array.isArray(improved?.hobbies) && improved.hobbies.length) {
        next.hobbies = normalizeUniqueStrings(improved.hobbies, 20);
    }

    return next;
};

export const uploadResumePDF = createAsyncThunk('resume/uploadResumePDF', async (file, { rejectWithValue }) => {
    try {
        if (!file) {
            throw new Error('Please select a resume PDF file.');
        }
        const response = await uploadResumeAPI(file);
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

export const generateLivePreviewSummary = createAsyncThunk(
    'resume/generateLivePreviewSummary',
    async ({ sourceSignature = '' } = {}, { getState, rejectWithValue }) => {
        try {
            const state = getState();
            const resumeData = state.resume.resumeData;
            const sanitizedResumeData = sanitizeResumeDataForAI(resumeData);
            const signature = String(sourceSignature || '').trim() || buildLivePreviewSourceSignature(sanitizedResumeData);

            const hasRole = Boolean(sanitizedResumeData.personalDetails?.title);
            const hasContext =
                hasRole ||
                sanitizedResumeData.workExperience.length > 0 ||
                sanitizedResumeData.projects.length > 0 ||
                sanitizedResumeData.internships.length > 0;

            if (!hasContext) {
                return {
                    summary: '',
                    sourceSignature: signature,
                    enhancedResume: mergeResumeData(resumeData),
                };
            }

            const response = await improveResumeContentAPI({
                mode: 'summary_preview',
                resumeData: sanitizedResumeData,
            });
            const data = unwrapApiPayload(response);
            const summary = normalizeLivePreviewSummaryText(data?.summary || '');

            if (!summary) {
                throw new Error('Unable to generate a valid live preview summary.');
            }

            const enhancedResume = applyAiImprovementsToResume(resumeData, {
                summary,
                workExperience: Array.isArray(data?.workExperience) ? data.workExperience : [],
                projects: Array.isArray(data?.projects) ? data.projects : [],
                internships: Array.isArray(data?.internships) ? data.internships : [],
            });

            return {
                summary,
                sourceSignature: signature,
                enhancedResume,
            };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, 'Unable to generate live preview summary.'));
        }
    },
);

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
        liveSummaryStatus: 'idle',
        liveSummaryError: null,
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
            state.liveSummaryStatus = 'idle';
            state.liveSummaryError = null;
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
            })
            .addCase(generateLivePreviewSummary.pending, (state) => {
                state.liveSummaryStatus = 'loading';
                state.liveSummaryError = null;
            })
            .addCase(generateLivePreviewSummary.fulfilled, (state, action) => {
                state.liveSummaryStatus = 'succeeded';
                state.liveSummaryError = null;

                const sourceSignature = String(action.payload?.sourceSignature || '').trim();
                const currentSignature = buildLivePreviewSourceSignature(state.resumeData);

                if (sourceSignature && currentSignature && sourceSignature !== currentSignature) {
                    return;
                }

                if (action.payload?.enhancedResume && typeof action.payload.enhancedResume === 'object') {
                    state.enhancedResume = mergeResumeData(action.payload.enhancedResume);
                    return;
                }

                const summary = normalizeLivePreviewSummaryText(action.payload?.summary || '');
                if (!summary) {
                    return;
                }

                const nextResume = mergeResumeData(state.resumeData);
                nextResume.personalDetails.summary = summary;
                state.enhancedResume = nextResume;
            })
            .addCase(generateLivePreviewSummary.rejected, (state, action) => {
                state.liveSummaryStatus = 'failed';
                state.liveSummaryError = action.payload || 'Unable to generate live preview summary.';
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
