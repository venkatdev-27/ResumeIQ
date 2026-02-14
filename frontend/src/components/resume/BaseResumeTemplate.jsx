import React from 'react';

const sectionTitleClassMap = {
    primary: 'text-primary',
    foreground: 'text-foreground',
};

const splitBulletLines = (value = '') => {
    const text = String(value || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();

    if (!text) {
        return [];
    }

    const bulletPrefix = /^[\u2022*-]\s*/;

    const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(bulletPrefix, '').trim())
        .filter(Boolean);

    if (lines.length > 1) {
        return lines.slice(0, 3);
    }

    if (bulletPrefix.test(text)) {
        return [text.replace(bulletPrefix, '').trim()];
    }

    return [];
};

const DescriptionBlock = ({ text, className }) => {
    const bullets = splitBulletLines(text);

    if (bullets.length) {
        return (
            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {bullets.map((line, index) => (
                    <li key={`${line}-${index}`} className="break-words text-[13px] leading-5">
                        {line}
                    </li>
                ))}
            </ul>
        );
    }

    return <p className={className}>{text || ''}</p>;
};

function BaseResumeTemplate({ resumeData, config }) {
    const personal = resumeData?.personalDetails || {};
    const workExperience = resumeData?.workExperience || [];
    const projects = resumeData?.projects || [];
    const internships = resumeData?.internships || [];
    const education = resumeData?.education || [];
    const skills = resumeData?.skills || [];
    const certifications = resumeData?.certifications || [];
    const achievements = resumeData?.achievements || [];
    const hobbies = resumeData?.hobbies || [];

    const sectionTitleClass = sectionTitleClassMap[config.titleTone] || sectionTitleClassMap.primary;

    const heading = (label) => (
        <div className="mb-2">
            <h3 className={`text-xs font-semibold uppercase tracking-wide ${sectionTitleClass}`}>{label}</h3>
            <hr className="mt-1 border-t border-muted-foreground/30" />
        </div>
    );

    return (
        <article className={`${config.containerClass} w-full max-w-full overflow-x-hidden break-words`}>
            <header className={config.headerClass}>
                <h2 className={config.nameClass}>{personal.fullName}</h2>
                <p className={config.titleClass}>{personal.title}</p>
                {[personal.email, personal.phone, personal.location].filter(Boolean).join(' | ') ? (
                    <p className={`${config.contactClass} break-words`}>
                        {[personal.email, personal.phone, personal.location].filter(Boolean).join(' | ')}
                    </p>
                ) : null}
                {(personal.linkedin || personal.website) && (
                    <p className={`${config.contactClass} break-all`}>
                        {[personal.linkedin, personal.website].filter(Boolean).join(' | ')}
                    </p>
                )}
            </header>

            <section className="mt-4">
                {heading('Summary')}
                <p className={config.mutedTextClass}>{personal.summary}</p>
            </section>

            <section className="mt-4">
                {heading('Skills')}
                <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill, index) => (
                        <span key={`${skill}-${index}`} className={`${config.skillPillClass} max-w-full break-all`}>
                            {skill}
                        </span>
                    ))}
                </div>
            </section>

            <section className="mt-4">
                {heading('Work Experience')}
                {workExperience.length ? (
                    <div className="space-y-2">
                        {workExperience.map((item, index) => (
                            <div key={`${item.company}-${index}`}>
                                <p className="break-words font-semibold text-foreground">
                                    {[item.role, item.company].filter(Boolean).join(' - ')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {[item.startDate, item.endDate].filter(Boolean).join(' - ')}
                                </p>
                                <DescriptionBlock text={item.description} className={config.mutedTextClass} />
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>

            <section className="mt-4">
                {heading('Projects')}
                {projects.length ? (
                    <div className="space-y-2">
                        {projects.map((item, index) => (
                            <div key={`${item.name}-${index}`}>
                                <p className="break-words font-semibold text-foreground">{item.name}</p>
                                <p className="break-words text-xs text-muted-foreground">{item.techStack}</p>
                                <DescriptionBlock text={item.description} className={config.mutedTextClass} />
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>

            <section className="mt-4">
                {heading('Education')}
                {education.length ? (
                    <div className="space-y-2">
                        {education.map((item, index) => (
                            <div key={`${item.institution}-${index}`}>
                                <p className="break-words font-semibold text-foreground">
                                    {[item.degree, item.institution].filter(Boolean).join(' - ')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {[item.startYear, item.endYear].filter(Boolean).join(' - ')}
                                </p>
                                <p className={config.mutedTextClass}>{item.description}</p>
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>

            {internships.length ? (
                <section className="mt-4">
                    {heading('Internships')}
                    <div className="space-y-2">
                        {internships.map((item, index) => (
                            <div key={`${item.company}-${index}`}>
                                <p className="break-words font-semibold text-foreground">{[item.role, item.company].filter(Boolean).join(' - ')}</p>
                                <DescriptionBlock text={item.description} className={config.mutedTextClass} />
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}

            {(certifications.length || achievements.length || hobbies.length) && (
                <section className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                        {heading('Certifications')}
                        {certifications.length > 0 ? (
                            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                                {certifications.map((cert, index) => (
                                    <li key={`${cert}-${index}`} className="break-words text-[13px] leading-5">
                                        {cert}.
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                    <div>
                        {heading('Achievements')}
                        {achievements.length > 0 ? (
                            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                                {achievements.map((item, index) => (
                                    <li key={`${item}-${index}`} className="break-words text-[13px] leading-5">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                    <div>
                        {heading('Hobbies')}
                        {hobbies.length > 0 ? (
                            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                                {hobbies.map((item, index) => (
                                    <li key={`${item}-${index}`} className="break-words text-[13px] leading-5">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                </section>
            )}
        </article>
    );
}

export default React.memo(BaseResumeTemplate);
