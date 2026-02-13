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

const createEmptyInternship = () => ({
    company: '',
    role: '',
    startDate: '',
    endDate: '',
    description: '',
});

function Internships({ value = [], onChange, disabled = false }) {
    const addInternship = () => onChange([...(value || []), createEmptyInternship()]);

    const removeInternship = (index) => onChange((value || []).filter((_item, itemIndex) => itemIndex !== index));

    const updateInternship = (index, field, fieldValue) => {
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
            title="Internships"
            description="Include internships that demonstrate relevant responsibilities, tools, and outcomes."
            hideTitle={true}
        >
            <div className="flex items-center justify-end">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addInternship}
                    disabled={disabled}
                    className={resumeFormActionButtonClass}
                >
                    Add Internship
                </Button>
            </div>

            {(value || []).length === 0 ? (
                <p className="rounded-3xl border border-dashed border-[#b8beca] bg-[#f4f5f8] px-4 py-5 text-sm font-medium text-[#596171]">
                    No internships added yet.
                </p>
            ) : null}

            {(value || []).map((item, index) => (
                <article key={`internship-${index}`} className={resumeFormPanelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="font-ui-heading text-xl font-bold text-[#111827]">Internship {index + 1}</h3>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeInternship(index)}
                            disabled={disabled}
                            className={resumeFormActionButtonClass}
                        >
                            Remove
                        </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Company"
                            value={item.company || ''}
                            onChange={(event) => updateInternship(index, 'company', event.target.value)}
                            disabled={disabled}
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                        />
                        <Input
                            label="Role"
                            value={item.role || ''}
                            onChange={(event) => updateInternship(index, 'role', event.target.value)}
                            disabled={disabled}
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                        />
                        <Input
                            label="Start Date"
                            value={item.startDate || ''}
                            onChange={(event) => updateInternship(index, 'startDate', event.target.value)}
                            disabled={disabled}
                            placeholder="MM/YYYY"
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                        />
                        <Input
                            label="End Date"
                            value={item.endDate || ''}
                            onChange={(event) => updateInternship(index, 'endDate', event.target.value)}
                            disabled={disabled}
                            placeholder="MM/YYYY or Present"
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                        />
                    </div>

                    <div>
                        <label className={resumeFormLabelClass}>Internship Description</label>
                        <textarea
                            value={item.description || ''}
                            onChange={(event) => updateInternship(index, 'description', event.target.value)}
                            disabled={disabled}
                            className={resumeFormTextareaClass}
                            placeholder="Describe your tasks and contributions."
                        />
                    </div>
                </article>
            ))}
        </StepSectionLayout>
    );
}

export default React.memo(Internships);
