import React, { useMemo } from 'react';
import StepSectionLayout from './StepSectionLayout';
import { resumeFormTextareaClass } from './formStyles';

function TagListSection({
    title,
    placeholder,
    value = [],
    onChange,
    disabled = false,
    helperText = '',
    description = '',
    hideTitle = false,
}) {
    const inputValue = useMemo(() => (value || []).join(', '), [value]);

    const updateValue = (event) => {
        const parsed = event.target.value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        onChange(parsed);
    };

    const enhancedPlaceholder = placeholder || 'Add comma-separated items here';

    return (
        <StepSectionLayout title={title} description={description} hideTitle={hideTitle}>
            {helperText ? <p className="text-sm font-medium text-[#5d6678]">{helperText}</p> : null}
            <textarea
                value={inputValue}
                onChange={updateValue}
                disabled={disabled}
                className={`${resumeFormTextareaClass} min-h-[170px]`}
                placeholder={enhancedPlaceholder}
            />
        </StepSectionLayout>
    );
}

export default React.memo(TagListSection);
