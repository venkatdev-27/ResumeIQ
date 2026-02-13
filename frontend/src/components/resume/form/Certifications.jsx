import React from 'react';
import TagListSection from './TagListSection';

function Certifications(props) {
    return (
        <TagListSection
            {...props}
            title="Certifications"
            placeholder="AWS Certified Developer, Google Cloud Associate Engineer"
            description="Add certifications that are active and relevant to your domain."
            helperText="Include active certifications relevant to your target role."
            hideTitle={true}
        />
    );
}

export default React.memo(Certifications);
