import React from 'react';
import TagListSection from './TagListSection';

function Skills(props) {
    return (
        <TagListSection
            {...props}
            title="Skills"
            placeholder="React, Redux Toolkit, Node.js, MongoDB, Docker, AWS"
            description="List the core skills that match your target role."
            helperText="Required. Use role-relevant technical and domain skills separated by commas."
            hideTitle={true}
        />
    );
}

export default React.memo(Skills);
