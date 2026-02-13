 import React from 'react';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import StepSectionLayout from './StepSectionLayout';
import {
    resumeFormActionButtonClass,
    resumeFormInputClass,
    resumeFormLabelClass,
    resumeFormPanelClass,
    resumeFormTextareaClass,
} from './formStyles';

const createEmptyExperience = () => ({
    company: '',
    role: '',
    startDate: '',
    endDate: '',
    description: '',
});

function WorkExperience({ value = [], onChange, disabled = false }) {
    const addExperience = () => {
        onChange([...(value || []), createEmptyExperience()]);
    };

    const removeExperience = (index) => {
        onChange((value || []).filter((_item, itemIndex) => itemIndex !== index));
    };

    const updateExperience = (index, field, fieldValue) => {
        onChange(
            (value || []).map((item, itemIndex) =>
                itemIndex === index
                    ? {
                          ...item,
                          [field]: fieldValue,
                      }
                    : item,
            ),
        );
    };

    return (
            <StepSectionLayout
                title="Work Experience"
                description="Highlight roles, responsibilities, and measurable achievements."
                hideTitle={true}
            >
            <div className="flex items-center justify-end">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addExperience}
                    disabled={disabled}
                    className={resumeFormActionButtonClass}
                >
                    Add Experience
                </Button>
            </div>

            {(value || []).map((item, index) => (
                <article key={`work-${index}`} className={resumeFormPanelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="font-ui-heading text-xl font-bold text-[#111827]">Experience {index + 1}</h3>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeExperience(index)}
                            disabled={disabled || value.length <= 1}
                            className={resumeFormActionButtonClass}
                        >
                            Remove
                        </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Job Title"
                            value={item.role || ''}
                            onChange={(event) => updateExperience(index, 'role', event.target.value)}
                            disabled={disabled}
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                            placeholder="e.g., Senior Software Engineer, Product Manager"
                        />
                        <Input
                            label="Employer"
                            value={item.company || ''}
                            onChange={(event) => updateExperience(index, 'company', event.target.value)}
                            disabled={disabled}
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                            placeholder="e.g., Google, Microsoft, Startup Name"
                        />
                        <Input
                            label="Start Date"
                            value={item.startDate || ''}
                            onChange={(event) => updateExperience(index, 'startDate', event.target.value)}
                            disabled={disabled}
                            placeholder="MM/YYYY"
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                        />
                        <Input
                            label="End Date"
                            value={item.endDate || ''}
                            onChange={(event) => updateExperience(index, 'endDate', event.target.value)}
                            disabled={disabled}
                            placeholder="MM/YYYY or Present"
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                        />
                    </div>

                    <div>
                        <label className={resumeFormLabelClass}>Job Description</label>
                        <textarea
                            value={item.description || ''}
                            onChange={(event) => updateExperience(index, 'description', event.target.value)}
                            disabled={disabled}
                            className={resumeFormTextareaClass}
                            placeholder="Write your responsibilities and achievements."
                        />
                    </div>
                </article>
            ))}
        </StepSectionLayout>
    );
}

export default React.memo(WorkExperience);
