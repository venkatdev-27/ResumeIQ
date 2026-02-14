import React from 'react';
import { formToResumeData } from '@/utils/helpers';
import { formatDateRange, formatEducationDegreeYear, getTemplateData, joinNonEmpty, toBullets, toSkillDisplayLines } from './templateData';

function TemplateThree({ resumeData, formData }) {
    const source = resumeData || formToResumeData(formData || {});
    const data = getTemplateData(source);
    const skillLines = toSkillDisplayLines(data.skills);
    const primaryContact = joinNonEmpty([data.personalDetails.email, data.personalDetails.phone, data.personalDetails.location]);
    const secondaryContact = joinNonEmpty([data.personalDetails.linkedin, data.personalDetails.website]);
    const hasPhoto = Boolean(data.personalDetails.photo);
    const sidebarHeadingClass = 'text-xs font-bold uppercase tracking-[0.14em] text-[#1d4ed8]';
    const sidebarRuleClass = 'mt-1 border-t border-[#bfdbfe]';
    const mainHeadingClass = 'text-xs font-bold uppercase tracking-[0.14em] text-[#374151]';
    const mainRuleClass = 'mt-1 border-t border-[#d1d5db]';

    return (
        <div id="resume-pdf" className="w-[794px] min-h-[1123px] bg-white p-8 text-sm leading-snug text-[#1f2937]">
            <div className="text-sm leading-5 break-words">
                <header className="mb-3 border-b border-gray-300 pb-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                            {hasPhoto ? (
                                <img
                                    src={data.personalDetails.photo}
                                    alt={data.personalDetails.fullName ? `${data.personalDetails.fullName} profile` : 'Profile photo'}
                                    className="h-14 w-14 rounded-full object-cover"
                                />
                            ) : null}
                            <h1 className="text-lg font-bold tracking-tight text-[#111827]">{data.personalDetails.fullName}</h1>
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Developer Resume</p>
                    </div>
                    <p className="min-w-0 break-words text-sm font-semibold text-[#374151]">{data.personalDetails.title}</p>
                    {primaryContact ? <p className="break-words text-xs text-[#4b5563]">{primaryContact}</p> : null}
                    {secondaryContact ? <p className="break-all text-xs text-[#4b5563]">{secondaryContact}</p> : null}
                </header>

                <div className="grid grid-cols-[minmax(0,34%)_minmax(0,66%)] gap-4">
                    <aside className="min-w-0 space-y-3 rounded-lg border border-[#dbeafe] bg-[#eaf3ff] p-3">
                        {data.personalDetails.summary ? (
                            <section className="min-w-0 space-y-1">
                                <div>
                                    <h2 className={sidebarHeadingClass}>Summary</h2>
                                    <hr className={sidebarRuleClass} />
                                </div>
                                <p className="resume-summary-paragraph text-sm text-[#1e3a8a]">{data.personalDetails.summary}</p>
                            </section>
                        ) : null}

                        {data.skills.length > 0 ? (
                            <section className="min-w-0 space-y-1">
                                <div>
                                    <h2 className={sidebarHeadingClass}>Technical Skills</h2>
                                    <hr className={sidebarRuleClass} />
                                </div>
                                {skillLines.map((line, lineIndex) => (
                                    <p key={`skill-line-${lineIndex}`} className="break-words text-sm text-[#1e3a8a]">
                                        {line.heading ? (
                                            <>
                                                <span className="font-semibold text-[#1e3a8a]">{line.heading}:</span> {line.text}
                                            </>
                                        ) : (
                                            line.text
                                        )}
                                    </p>
                                ))}
                            </section>
                        ) : null}

                        {data.education.length > 0 ? (
                            <section className="min-w-0 space-y-1">
                                <div>
                                    <h2 className={sidebarHeadingClass}>Education</h2>
                                    <hr className={sidebarRuleClass} />
                                </div>
                                {data.education.map((item) => (
                                    <p key={item.institution} className="break-words text-sm text-[#1e3a8a]">
                                        <span className="font-semibold">{formatEducationDegreeYear(item)}</span>
                                    </p>
                                ))}
                            </section>
                        ) : null}

                        {data.certifications.length > 0 ? (
                            <section className="min-w-0 space-y-1">
                                <div>
                                    <h2 className={sidebarHeadingClass}>Certifications</h2>
                                    <hr className={sidebarRuleClass} />
                                </div>
                                <ul className="list-disc space-y-1 pl-4 text-sm marker:text-[#2563eb]">
                                    {data.certifications.map((item) => (
                                        <li key={item} className="break-words text-[#1e3a8a]">{item}</li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}

                        {data.achievements.length > 0 ? (
                            <section className="min-w-0 space-y-1">
                                <div>
                                    <h2 className={sidebarHeadingClass}>Achievements</h2>
                                    <hr className={sidebarRuleClass} />
                                </div>
                                <ul className="list-disc space-y-1 pl-4 text-sm marker:text-[#2563eb]">
                                    {data.achievements.map((item) => (
                                        <li key={item} className="break-words text-[#1e3a8a]">{item}</li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}

                        {data.hobbies.length > 0 ? (
                            <section className="min-w-0 space-y-1">
                                <div>
                                    <h2 className={sidebarHeadingClass}>Hobbies</h2>
                                    <hr className={sidebarRuleClass} />
                                </div>
                                <ul className="list-disc space-y-1 pl-4 text-sm marker:text-[#2563eb]">
                                    {data.hobbies.map((item) => (
                                        <li key={item} className="break-words text-[#1e3a8a]">{item}</li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}
                    </aside>

                    <main className="min-w-0 space-y-3 rounded-lg bg-white p-3">
                        {data.workExperience.length > 0 ? (
                            <section className="min-w-0 space-y-2">
                                <div>
                                    <h2 className={mainHeadingClass}>Experience</h2>
                                    <hr className={mainRuleClass} />
                                </div>
                                {data.workExperience.map((item) => (
                                    <article key={`${item.company}-${item.role}`} className="min-w-0 space-y-1">
                                        <div className="mb-1 flex items-start justify-between gap-2">
                                            <p className="min-w-0 break-words text-sm font-semibold text-[#111827]">
                                                {joinNonEmpty([item.role, item.company], ' @ ')}
                                            </p>
                                            <p className="shrink-0 whitespace-nowrap text-right text-xs text-[#6b7280] empty:hidden">{formatDateRange(item.startDate, item.endDate)}</p>
                                        </div>
                                        <ul className="list-disc space-y-1 pl-4 text-sm marker:text-[0.72em] marker:text-[#374151]">
                                            {toBullets(item.description, [], { maxLines: item.bulletMaxLines || 3 }).map((line, lineIndex) => (
                                                <li key={`${item.company}-${lineIndex}`} className="break-words text-[#4b5563]">{line}</li>
                                            ))}
                                        </ul>
                                    </article>
                                ))}
                            </section>
                        ) : null}

                        {data.projects.length > 0 ? (
                            <section className="min-w-0 space-y-2">
                                <div>
                                    <h2 className={mainHeadingClass}>Projects</h2>
                                    <hr className={mainRuleClass} />
                                </div>
                                {data.projects.map((item) => (
                                    <article key={item.name} className="min-w-0 space-y-1">
                                        <p className="min-w-0 break-words text-sm font-semibold text-[#111827]">
                                            {joinNonEmpty([item.name, item.techStack])}
                                        </p>
                                        <p className="break-all text-xs text-[#2563eb]">{item.link}</p>
                                        <ul className="list-disc space-y-1 pl-4 text-sm marker:text-[0.72em] marker:text-[#374151]">
                                            {toBullets(item.description, [], { maxLines: item.bulletMaxLines || 3 }).map((line, lineIndex) => (
                                                <li key={`${item.name}-${lineIndex}`} className="break-words text-[#4b5563]">{line}</li>
                                            ))}
                                        </ul>
                                    </article>
                                ))}
                            </section>
                        ) : null}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default React.memo(TemplateThree);

