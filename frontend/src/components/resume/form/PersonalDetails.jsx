import React from 'react';
import Input from '@/components/common/Input';
import StepSectionLayout from './StepSectionLayout';
import { resumeFormInputClass, resumeFormLabelClass, resumeFormTextareaClass } from './formStyles';

function PersonalDetails({ value = {}, onChange, errors = {}, disabled = false }) {
    const updateField = (field) => (event) => {
        onChange({
            ...value,
            [field]: event.target.value,
        });
    };

    return (
            <StepSectionLayout
                title="Personal Details"
                description="Provide your contact information and professional summary."
                hideTitle={true}
            >
            <div className="grid gap-4 sm:grid-cols-2">
                <Input
                    label="Full Name"
                    value={value.fullName || ''}
                    onChange={updateField('fullName')}
                    error={errors.fullName}
                    required
                    disabled={disabled}
                    className={resumeFormInputClass}
                    labelClassName={resumeFormLabelClass}
                />
                <Input
                    label="Professional Title"
                    value={value.title || ''}
                    onChange={updateField('title')}
                    error={errors.title}
                    required
                    disabled={disabled}
                    className={resumeFormInputClass}
                    labelClassName={resumeFormLabelClass}
                />
                <Input
                    label="Email"
                    type="email"
                    value={value.email || ''}
                    onChange={updateField('email')}
                    error={errors.email}
                    required
                    disabled={disabled}
                    className={resumeFormInputClass}
                    labelClassName={resumeFormLabelClass}
                />
                <Input
                    label="Phone"
                    value={value.phone || ''}
                    onChange={updateField('phone')}
                    error={errors.phone}
                    required
                    disabled={disabled}
                    className={resumeFormInputClass}
                    labelClassName={resumeFormLabelClass}
                    placeholder="e.g., +1 (555) 123-4567"
                />
                <Input
                    label="Location"
                    value={value.location || ''}
                    onChange={updateField('location')}
                    error={errors.location}
                    required
                    disabled={disabled}
                    className={resumeFormInputClass}
                    labelClassName={resumeFormLabelClass}
                    placeholder="e.g., San Francisco, CA or Remote"
                />
                <Input
                    label="LinkedIn"
                    value={value.linkedin || ''}
                    onChange={updateField('linkedin')}
                    disabled={disabled}
                    className={resumeFormInputClass}
                    labelClassName={resumeFormLabelClass}
                />
            </div>
            <Input
                label="Portfolio / Website"
                value={value.website || ''}
                onChange={updateField('website')}
                disabled={disabled}
                className={resumeFormInputClass}
                labelClassName={resumeFormLabelClass}
            />
            <div>
                <label className={resumeFormLabelClass}>Summary</label>
                <textarea
                    value={value.summary || ''}
                    onChange={updateField('summary')}
                    disabled={disabled}
                    className={resumeFormTextareaClass}
                    placeholder="Write a concise professional summary."
                />
            </div>
        </StepSectionLayout>
    );
}

export default React.memo(PersonalDetails);
