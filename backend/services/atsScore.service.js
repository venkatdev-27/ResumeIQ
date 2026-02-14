const { ATS_PRIORITY_KEYWORDS } = require('../constants/atsKeywords');
const { extractKeywordsFromText } = require('./keywordExtract.service');
const { requestChatCompletion } = require('./aiClient.service');
const {
    calculateCoverageScore,
    calculateKeywordDensityScore,
    calculateSectionQualityScore,
    calculateOverallScore,
} = require('../utils/scoreCalculator');
const { normalizeText } = require('../utils/normalizeText');

const TECHNICAL_SKILL_SET = new Set(
    ATS_PRIORITY_KEYWORDS.filter((keyword) => !['communication', 'leadership', 'project management', 'problem solving'].includes(keyword)),
);

const normalizeForMatch = (value = '') => normalizeText(String(value || '')).toLowerCase().trim();
const normalizeSkillTerm = (value = '') => normalizeForMatch(value);
const toSafeAiJson = (data, maxChars = 12_000) => JSON.stringify(data ?? '').slice(0, maxChars);

const dedupeKeywords = (keywords = [], max = 45) => {
    const set = new Set();
    for (const value of keywords) {
        const normalized = normalizeForMatch(value);
        if (!normalized) {
            continue;
        }
        set.add(normalized);
        if (set.size >= max) {
            break;
        }
    }
    return [...set];
};

const normalizeSkillList = (skills = [], max = 25) => dedupeKeywords(skills.map((skill) => normalizeSkillTerm(skill)), max);

const keywordWeight = (keyword) => {
    if (ATS_PRIORITY_KEYWORDS.includes(keyword)) {
        return 2.2;
    }
    if (keyword.split(' ').length > 1) {
        return 1.6;
    }
    return 1.1;
};

const extractResumeSkills = (resumeData = null) => {
    const rawSkills = Array.isArray(resumeData?.skills) ? resumeData.skills : [];
    return normalizeSkillList(rawSkills, 30);
};

const buildResumeDrivenTargets = ({ resumeKeywords = [], resumeData = null }) => {
    const explicitSkills = extractResumeSkills(resumeData);
    const technicalKeywords = normalizeSkillList(
        resumeKeywords.filter((keyword) => TECHNICAL_SKILL_SET.has(normalizeSkillTerm(keyword))),
        30,
    );

    const targetSkills = normalizeSkillList([...explicitSkills, ...technicalKeywords], 25);
    const targetKeywords = dedupeKeywords([...resumeKeywords, ...targetSkills], 40);
    const safeKeywords = targetKeywords.length ? targetKeywords : dedupeKeywords(resumeKeywords.slice(0, 30), 30);

    return {
        source: 'resume',
        inferredProfile: 'resume-derived',
        targetKeywords: safeKeywords,
        targetSkills,
    };
};

const parseAiResumeTargets = (value = '') => {
    const cleaned = String(value)
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

    let parsed = null;
    try {
        parsed = JSON.parse(cleaned);
    } catch (_error) {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
            try {
                parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
            } catch (_nestedError) {
                parsed = null;
            }
        }
    }

    if (!parsed) {
        return null;
    }

    const targetKeywords = dedupeKeywords(parsed?.targetKeywords || [], 40);
    const targetSkills = normalizeSkillList(parsed?.targetSkills || [], 25);
    const inferredProfile = normalizeForMatch(parsed?.inferredProfile || parsed?.role || '') || 'general';

    if (!targetKeywords.length) {
        return null;
    }

    return {
        source: 'ai',
        inferredProfile,
        targetKeywords,
        targetSkills: targetSkills.length
            ? targetSkills
            : normalizeSkillList(
                  targetKeywords.filter((keyword) => TECHNICAL_SKILL_SET.has(keyword)),
                  20,
              ),
    };
};


const buildResumeOnlyPrompt = ({ resumeText, resumeKeywords }) => `You are an ATS optimization expert.
Analyze the resume and output keywords/skills that should naturally appear in summary, work experience, projects, and internships.
Return ONLY valid JSON:
{
  "inferredProfile": "string",
  "targetKeywords": ["keyword1", "keyword2"],
  "targetSkills": ["skill1", "skill2"]
}
Rules:
1) Use lowercase concise terms.
2) Do not include markdown or explanations.
3) targetKeywords must represent strong ATS words expected in summary/experience/projects/internships.
4) targetSkills must represent expected skills for this profile.

Resume text:
${resumeText}

Top extracted resume keywords:
${toSafeAiJson(resumeKeywords.slice(0, 30), 2_000)}`;

const getResumeOnlyTargets = async ({ normalizedResume, resumeKeywords, resumeData }) => {
    try {
        const responseText = await requestChatCompletion({
            messages: [
                {
                    role: 'user',
                    content: buildResumeOnlyPrompt({
                        resumeText: normalizedResume.slice(0, 10000),
                        resumeKeywords,
                    }),
                },
            ],
            jsonMode: true,
            expectJson: true,
            maxTokens: 1200,
        });

        const parsed = parseAiResumeTargets(responseText);
        if (parsed) {
            return parsed;
        }
    } catch (_error) {
        // Resume-driven fallback is used when AI call fails.
    }

    return buildResumeDrivenTargets({ resumeKeywords, resumeData });
};

const buildCriticalSectionText = (resumeData, fallbackText) => {
    const details = resumeData?.personalDetails || {};

    const summary = details.summary || '';
    const experienceText = Array.isArray(resumeData?.workExperience)
        ? resumeData.workExperience
              .map((entry) => [entry?.role, entry?.company, entry?.description].filter(Boolean).join(' '))
              .join('\n')
        : '';
    const projectsText = Array.isArray(resumeData?.projects)
        ? resumeData.projects
              .map((entry) => [entry?.name, entry?.techStack, entry?.description].filter(Boolean).join(' '))
              .join('\n')
        : '';
    const internshipsText = Array.isArray(resumeData?.internships)
        ? resumeData.internships
              .map((entry) => [entry?.role, entry?.company, entry?.description].filter(Boolean).join(' '))
              .join('\n')
        : '';

    const criticalText = [summary, experienceText, projectsText, internshipsText].filter(Boolean).join('\n');
    return normalizeForMatch(criticalText || fallbackText || '');
};

const buildSkillsText = (resumeData, fallbackText) => {
    const explicitSkills = Array.isArray(resumeData?.skills) ? resumeData.skills : [];
    const skillText = explicitSkills.join(', ');
    return normalizeForMatch(skillText || fallbackText || '');
};

const containsTerm = (text = '', term = '') => {
    const normalizedText = normalizeForMatch(text);
    const normalizedTerm = normalizeForMatch(term);

    if (!normalizedText || !normalizedTerm) {
        return false;
    }

    if (normalizedTerm.includes(' ')) {
        return normalizedText.includes(normalizedTerm);
    }

    return new RegExp(`\\b${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(normalizedText);
};

const calculateAtsScore = async ({ resumeText, resumeData = null }) => {
    const normalizedResume = normalizeForMatch(resumeText);

    if (!normalizedResume) {
        return {
            score: 0,
            matchedKeywords: [],
            missingKeywords: [],
            missingWords: [],
            missingSkills: [],
            recommendations: ['Upload a resume or provide resume content to start ATS analysis.'],
            analysisMode: 'resume_only',
            jobDescriptionUsed: false,
            meta: {
                coverageScore: 0,
                densityScore: 0,
                sectionScore: 0,
                aiAssisted: false,
                inferredProfile: 'general',
            },
        };
    }

    const criticalSectionText = buildCriticalSectionText(resumeData, normalizedResume);
    const skillsText = buildSkillsText(resumeData, normalizedResume);

    const resumeKeywords = extractKeywordsFromText(normalizedResume, { maxKeywords: 120 });
    const resumeKeywordTerms = resumeKeywords.map((entry) => entry.term);

    const inferredTargets = await getResumeOnlyTargets({
        normalizedResume,
        resumeKeywords: resumeKeywordTerms,
        resumeData,
    });

    const targetKeywords = dedupeKeywords(inferredTargets.targetKeywords, 40);
    const targetSkills = normalizeSkillList(inferredTargets.targetSkills, 20);
    const scoringTargets = dedupeKeywords([...targetKeywords, ...targetSkills], 45);
    const matchedKeywords = [];
    const missingKeywords = [];
    const weightMap = new Map(scoringTargets.map((keyword) => [keyword, keywordWeight(keyword)]));

    let totalWeight = scoringTargets.reduce((sum, keyword) => sum + (weightMap.get(keyword) || 1), 0);
    let matchedWeight = 0;

    for (const keyword of scoringTargets) {
        const weight = weightMap.get(keyword) || 1;
        if (containsTerm(criticalSectionText, keyword)) {
            matchedKeywords.push(keyword);
            matchedWeight += weight;
        } else {
            missingKeywords.push(keyword);
        }
    }

    const missingSkillsSet = new Set(targetSkills.filter((skill) => !containsTerm(skillsText, skill)));

    for (const keyword of ATS_PRIORITY_KEYWORDS) {
        if (missingSkillsSet.size >= 20) {
            break;
        }
        const normalizedSkill = normalizeSkillTerm(keyword);
        if (!normalizedSkill) {
            continue;
        }
        if (!missingSkillsSet.has(normalizedSkill) && TECHNICAL_SKILL_SET.has(normalizedSkill) && containsTerm(missingKeywords.join(' '), normalizedSkill)) {
            missingSkillsSet.add(normalizedSkill);
        }
    }

    const missingSkills = normalizeSkillList([...missingSkillsSet], 20);

    if (totalWeight <= 0) {
        totalWeight = 1;
    }

    const coverageScore = calculateCoverageScore({ matchedWeight, totalWeight });
    const densityScore = calculateKeywordDensityScore({
        resumeText: normalizedResume,
        matchedKeywords,
    });
    const sectionScore = calculateSectionQualityScore(normalizedResume);
    const score = Math.round(
        calculateOverallScore({
            coverageScore,
            densityScore,
            sectionScore,
        }),
    );

    const recommendations = ['ATS score is calculated from your uploaded resume content (no dummy placeholder data).'];
    if (missingKeywords.length > 0) {
        recommendations.push(`Add missing words in summary/experience/projects/internships: ${missingKeywords.slice(0, 6).join(', ')}.`);
    }
    if (missingSkills.length > 0) {
        recommendations.push(`Strengthen your skills section with: ${missingSkills.slice(0, 6).join(', ')}.`);
    }
    if (sectionScore < 60) {
        recommendations.push('Improve section clarity using clear headings for Summary, Experience, Skills, and Education.');
    }
    if (densityScore < 55) {
        recommendations.push('Increase relevant keyword usage in project and experience bullets without keyword stuffing.');
    }

    return {
        score,
        matchedKeywords: matchedKeywords.slice(0, 25),
        missingKeywords: missingKeywords.slice(0, 25),
        missingWords: missingKeywords.slice(0, 25),
        missingSkills: missingSkills.slice(0, 20),
        recommendations,
        analysisMode: 'resume_only',
        jobDescriptionUsed: false,
        meta: {
            coverageScore: Math.round(coverageScore),
            densityScore: Math.round(densityScore),
            sectionScore: Math.round(sectionScore),
            aiAssisted: inferredTargets.source === 'ai',
            inferredProfile: inferredTargets.inferredProfile || 'general',
        },
    };
};

module.exports = {
    calculateAtsScore,
};
