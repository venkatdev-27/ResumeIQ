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

const createEmptyProject = () => ({
    name: '',
    techStack: '',
    link: '',
    description: '',
});

function Projects({ value = [], onChange, disabled = false }) {
    const addProject = () => onChange([...(value || []), createEmptyProject()]);

    const removeProject = (index) => onChange((value || []).filter((_item, itemIndex) => itemIndex !== index));

    const updateProject = (index, field, fieldValue) => {
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
                title="Projects"
                description="Showcase projects that demonstrate your skills and problem-solving abilities."
                hideTitle={true}
            >
            <div className="flex items-center justify-end">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addProject}
                    disabled={disabled}
                    className={resumeFormActionButtonClass}
                >
                    Add Project
                </Button>
            </div>

            {(value || []).map((item, index) => (
                <article key={`project-${index}`} className={resumeFormPanelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="font-ui-heading text-xl font-bold text-[#111827]">Project {index + 1}</h3>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeProject(index)}
                            disabled={disabled || value.length <= 1}
                            className={resumeFormActionButtonClass}
                        >
                            Remove
                        </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Project Name"
                            value={item.name || ''}
                            onChange={(event) => updateProject(index, 'name', event.target.value)}
                            disabled={disabled}
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                        />
                        <Input
                            label="Tech Stack"
                            value={item.techStack || ''}
                            onChange={(event) => updateProject(index, 'techStack', event.target.value)}
                            disabled={disabled}
                            className={resumeFormInputClass}
                            labelClassName={resumeFormLabelClass}
                        />
                    </div>

                    <Input
                        label="Project Link"
                        value={item.link || ''}
                        onChange={(event) => updateProject(index, 'link', event.target.value)}
                        disabled={disabled}
                        className={resumeFormInputClass}
                        labelClassName={resumeFormLabelClass}
                    />

                    <div>
                        <label className={resumeFormLabelClass}>Project Description</label>
                        <textarea
                            value={item.description || ''}
                            onChange={(event) => updateProject(index, 'description', event.target.value)}
                            disabled={disabled}
                            className={resumeFormTextareaClass}
                            placeholder="Highlight what you built and how you implemented it."
                        />
                    </div>
                </article>
            ))}
        </StepSectionLayout>
    );
}

export default React.memo(Projects);
