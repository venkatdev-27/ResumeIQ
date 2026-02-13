import React from 'react';
import TagListSection from './TagListSection';

function Achievements(props) {
    return (
        <TagListSection
            {...props}
            title="Achievements"
            placeholder="Reduced API latency by 40%, Winner - National Hackathon 2025"
            description="Add concrete achievements that highlight recognition and impact and sepated by dot ."
            helperText="Highlight measurable wins and recognition."
            hideTitle={true}
        />
    );
}

export default React.memo(Achievements);
