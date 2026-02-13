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

const createEmptyEducation = () => ({
    institution: '',
    degree: '',
    startYear: '',
    endYear: '',
    description: '',
});

function Education({ value = [], onChange, disabled = false }) {
    const addEducation = () => onChange([...(value || []), createEmptyEducation()]);

    const removeEducation = (index) => onChange((value || []).filter((_item, itemIndex) => itemIndex !== index));

    const updateEducation = (index, field, fieldValue) => {
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
                title="Education"
                description="List your degrees, certifications, and relevant coursework."
                hideTitle={true}
            >
            <div className="flex items-center justify-end">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addEducation}
                    disabled={disabled}
                    className={resumeFormActionButtonClass}
                >
                    Add Education
                </Button>
            </div>

            {(value || []).map((item, index) => (
                <article key={`education-${index}`} className={resumeFormPanelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="font-ui-heading text-xl font-bold text-[#111827]">Education {index + 1}</h3>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeEducation(index)}
                            disabled={disabled || value.length <= 1}
                            className={resumeFormActionButtonClass}
                        >
                            Remove
                        </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Institution"
                            value={item.institution || ''}
                            onChange={(event) => updateEducation(index, 'institution', event.target.value)}
                            disabled={disabled}
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                            placeholder="e.g., Stanford University, MIT"
                        />
                        <Input
                            label="Degree"
                            value={item.degree || ''}
                            onChange={(event) => updateEducation(index, 'degree', event.target.value)}
                            disabled={disabled}
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                            placeholder="e.g., B.S. Computer Science, M.A. Design"
                        />
                        <Input
                            label="Start Year"
                            value={item.startYear || ''}
                            onChange={(event) => updateEducation(index, 'startYear', event.target.value)}
                            disabled={disabled}
                            placeholder="YYYY"
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                        />
                        <Input
                            label="End Year"
                            value={item.endYear || ''}
                            onChange={(event) => updateEducation(index, 'endYear', event.target.value)}
                            disabled={disabled}
                            placeholder="YYYY"
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                        />
                    </div>
                    <div>
                        <label className={resumeFormLabelClass}>Details</label>
                        <textarea
                            value={item.description || ''}
                            onChange={(event) => updateEducation(index, 'description', event.target.value)}
                            disabled={disabled}
                            className={resumeFormTextareaClass}
                            placeholder="Honors, coursework, or academic highlights."
                        />
                    </div>
                </article>
            ))}
        </StepSectionLayout>
    );
}

export default React.memo(Education);
