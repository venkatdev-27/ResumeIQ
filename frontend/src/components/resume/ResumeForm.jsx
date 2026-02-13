import React, { useMemo, useState } from 'react';
import FormStepper from '@/components/resume/form/FormStepper';
import PersonalDetails from '@/components/resume/form/PersonalDetails';
import WorkExperience from '@/components/resume/form/WorkExperience';
import Projects from '@/components/resume/form/Projects';
import Internships from '@/components/resume/form/Internships';
import Education from '@/components/resume/form/Education';
import Skills from '@/components/resume/form/Skills';
import Certifications from '@/components/resume/form/Certifications';
import Achievements from '@/components/resume/form/Achievements';
import Hobbies from '@/components/resume/form/Hobbies';

const formSteps = [
    { key: 'personalDetails', label: 'Personal', shortLabel: 'Personal', component: PersonalDetails },
    { key: 'workExperience', label: 'Experience', shortLabel: 'Work', component: WorkExperience },
    { key: 'projects', label: 'Projects', shortLabel: 'Projects', component: Projects },
    { key: 'internships', label: 'Internships', shortLabel: 'Intern', component: Internships },
    { key: 'education', label: 'Education', shortLabel: 'Education', component: Education },
    { key: 'skills', label: 'Skills', shortLabel: 'Skills', component: Skills },
    { key: 'certifications', label: 'Certifications', shortLabel: 'Certs', component: Certifications },
    { key: 'achievements', label: 'Achievements', shortLabel: 'Wins', component: Achievements },
    { key: 'hobbies', label: 'Hobbies', shortLabel: 'Hobbies', component: Hobbies },
];

const validateStep = (stepKey, resumeData) => {
    const errors = {};

    if (stepKey === 'personalDetails') {
        const details = resumeData.personalDetails || {};
        if (!details.fullName?.trim()) {
            errors.fullName = 'Full name is required.';
        }
        if (!details.email?.trim()) {
            errors.email = 'Email is required.';
        }
        if (!details.phone?.trim()) {
            errors.phone = 'Phone is required.';
        }
        if (!details.location?.trim()) {
            errors.location = 'Location is required.';
        }
        if (!details.title?.trim()) {
            errors.title = 'Professional title is required.';
        }
    }

    if (stepKey === 'education') {
        const list = resumeData.education || [];
        const hasValid = list.some((entry) => entry.institution?.trim() || entry.degree?.trim());
        if (!hasValid) {
            errors._section = 'Add at least one education entry.';
        }
    }

    if (stepKey === 'skills') {
        const skills = Array.isArray(resumeData.skills) ? resumeData.skills : [];
        const validSkills = skills.map((item) => String(item || '').trim()).filter(Boolean);
        if (!validSkills.length) {
            errors._section = 'Add at least one skill.';
        }
    }

    return errors;
};

const REQUIRED_STEP_KEYS = ['personalDetails', 'education', 'skills'];

function ResumeForm({
    resumeData,
    onUpdateResumeSection,
    disabled = false,
    saveStatus = 'idle',
    onSave,
    saveError = null,
    onEnhance,
    improveStatus = 'idle',
    improveError = null,
}) {
    const [currentStep, setCurrentStep] = useState(0);
    const [errors, setErrors] = useState({});

    const stepConfig = formSteps[currentStep];
    const StepComponent = stepConfig.component;
    const stepValue = resumeData?.[stepConfig.key];

    const canGoBack = currentStep > 0;
    const isLastStep = currentStep === formSteps.length - 1;
    const isSaving = saveStatus === 'loading';
    const isEnhancing = improveStatus === 'loading';

    const stepErrors = useMemo(() => validateStep(stepConfig.key, resumeData), [stepConfig.key, resumeData]);

    const updateStepValue = (value) => {
        onUpdateResumeSection(stepConfig.key, value);
        if (Object.keys(errors).length > 0) {
            setErrors({});
        }
    };

    const goNext = () => {
        const validationErrors = validateStep(stepConfig.key, resumeData);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        if (!isLastStep) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const goBack = () => {
        if (canGoBack) {
            setCurrentStep((prev) => prev - 1);
            setErrors({});
        }
    };

    const selectStep = (index) => {
        if (index <= currentStep) {
            setCurrentStep(index);
            setErrors({});
        }
    };

    const handleSave = async () => {
        if (!onSave) {
            return;
        }

        for (let index = 0; index < formSteps.length; index += 1) {
            const step = formSteps[index];
            if (!REQUIRED_STEP_KEYS.includes(step.key)) {
                continue;
            }

            const validationErrors = validateStep(step.key, resumeData);
            if (Object.keys(validationErrors).length > 0) {
                setCurrentStep(index);
                setErrors(validationErrors);
                return;
            }
        }

        await onSave();
    };

    return (
        <div className="space-y-5 pb-24 sm:pb-10">
            <FormStepper
                steps={formSteps}
                currentStep={currentStep}
                onNext={goNext}
                onBack={goBack}
                onStepSelect={selectStep}
                isNextDisabled={disabled || isEnhancing}
                isBackDisabled={!canGoBack || disabled || isEnhancing}
                isSaving={isSaving}
                onSave={handleSave}
                onEnhance={onEnhance}
                isEnhancing={isEnhancing}
                isEnhanceDisabled={disabled || isSaving || isEnhancing}
            />

            {(errors._section || stepErrors._section) && (
                <p className="rounded-2xl border border-[#f0b3b3] bg-[#ffe9e9] px-4 py-2.5 text-sm font-medium text-[#b12626]">
                    {errors._section || stepErrors._section}
                </p>
            )}

            <StepComponent value={stepValue} onChange={updateStepValue} errors={errors} disabled={disabled || isSaving || isEnhancing} />

            {improveError ? <p className="text-sm text-destructive">{improveError}</p> : null}
            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
        </div>
    );
}

export default React.memo(ResumeForm);
