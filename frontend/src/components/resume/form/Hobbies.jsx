import React from 'react';
import TagListSection from './TagListSection';

function Hobbies(props) {
    return (
        <TagListSection
            {...props}
            title="Hobbies"
            placeholder="Open-source contribution, Chess, Blogging"
            description="Add hobbies that positively represent your personality."
            helperText="Optional: include hobbies that add positive personality context."
            hideTitle={true}
        />
    );
}

export default React.memo(Hobbies);
