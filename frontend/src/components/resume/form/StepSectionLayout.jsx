import React from 'react';

function StepSectionLayout({ title, description, children, hideTitle = false }) {
    return (
        <section className="space-y-6">
            <header className="space-y-3">
                {!hideTitle && (
                    <h2 className="font-ui-heading text-[2rem] font-extrabold tracking-tight text-[#111827] sm:text-5xl">{title}</h2>
                )}
                {description ? (
                    <p className="max-w-3xl text-[1rem] leading-7 text-[#3e4653] sm:text-[1.35rem]">{description}</p>
                ) : null}
            </header>
            <div className="space-y-5">{children}</div>
        </section>
    );
}

export default React.memo(StepSectionLayout);
