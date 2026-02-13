import React from 'react';
import { formToResumeData } from '@/utils/helpers';
import { formatDateRange, formatEducationDegreeYear, getTemplateData, joinNonEmpty, toBullets, toSkillDisplayLines } from './templateData';

function TemplateFour({ resumeData, formData }) {
    const source = resumeData || formToResumeData(formData || {});
    const data = getTemplateData(source);
    const skillLines = toSkillDisplayLines(data.skills);
    const primaryContact = joinNonEmpty([data.personalDetails.email, data.personalDetails.phone, data.personalDetails.location]);
    const secondaryContact = joinNonEmpty([data.personalDetails.linkedin, data.personalDetails.website]);
    const sidebarHeadingClass = 'text-xs font-bold uppercase tracking-[0.14em] text-[#b45309]';
    const sidebarRuleClass = 'mt-1 border-t border-[#f4c28a]';
    const mainHeadingClass = 'text-xs font-bold uppercase tracking-[0.14em] text-[#374151]';
    const mainRuleClass = 'mt-1 border-t border-[#d1d5db]';

    return (
        <div id="resume-pdf" className="w-[794px] min-h-[1123px] bg-white p-8 text-sm leading-snug text-[#1f2937]">
            <div className="text-sm leading-5 break-words">
                <header className="mb-4 border-b border-gray-300 pb-3">
                    <h1 className="text-lg font-bold tracking-tight text-[#111827]">{data.personalDetails.fullName}</h1>
                    <p className="min-w-0 break-words text-sm font-semibold text-[#374151]">{data.personalDetails.title}</p>
                    {primaryContact ? <p className="break-words text-xs text-[#4b5563]">{primaryContact}</p> : null}
                    {secondaryContact ? <p className="break-all text-xs text-[#4b5563]">{secondaryContact}</p> : null}
                </header>

                <div className="grid grid-cols-[minmax(0,33%)_minmax(0,67%)] gap-4">
                    <aside className="min-w-0 space-y-3 rounded-lg border border-[#f4c28a] bg-[#fff4e6] p-3">
                        {data.personalDetails.summary ? (
                            <section className="min-w-0 space-y-1">
                                <div>
                                    <h2 className={sidebarHeadingClass}>Professional Summary</h2>
                                    <hr className={sidebarRuleClass} />
                                </div>
                                <p className="whitespace-pre-line text-sm text-[#92400e]">{data.personalDetails.summary}</p>
                            </section>
                        ) : null}

                        {data.skills.length > 0 ? (
                            <section className="min-w-0 space-y-1">
                                <div>
                                    <h2 className={sidebarHeadingClass}>Technical Skills</h2>
                                    <hr className={sidebarRuleClass} />
                                </div>
                                {skillLines.map((line, lineIndex) => (
                                    <p key={`skill-line-${lineIndex}`} className="break-words text-sm text-[#92400e]">
                                        {line.heading ? (
                                            <>
                                                <span className="font-semibold text-[#92400e]">{line.heading}:</span> {line.text}
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
                                    <p key={item.institution} className="break-words text-sm text-[#92400e]">
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
                                <ul className="list-disc space-y-1 pl-4 text-sm marker:text-[#b45309]">
                                    {data.certifications.map((item) => (
                                        <li key={item} className="break-words text-[#92400e]">{item}</li>
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
                                <ul className="list-disc space-y-1 pl-4 text-sm marker:text-[#b45309]">
                                    {data.achievements.map((item) => (
                                        <li key={item} className="break-words text-[#92400e]">{item}</li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}
                    </aside>

                    <main className="min-w-0 space-y-3 rounded-lg bg-white p-3">
                        {data.workExperience.length > 0 ? (
                            <section className="min-w-0 space-y-2">
                                <div>
                                    <h2 className={mainHeadingClass}>Work Experience</h2>
                                    <hr className={mainRuleClass} />
                                </div>
                                {data.workExperience.map((item) => (
                                    <article key={`${item.company}-${item.role}`} className="min-w-0 space-y-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="min-w-0 break-words text-sm font-semibold text-[#9a3412]">
                                                {joinNonEmpty([item.role, item.company])}
                                            </p>
                                            <p className="shrink-0 whitespace-nowrap text-right text-xs text-[#6b7280] empty:hidden">{formatDateRange(item.startDate, item.endDate)}</p>
                                        </div>
                                        <ul className="list-disc space-y-1 pl-4 text-sm marker:text-[0.72em] marker:text-[#374151]">
                                            {toBullets(item.description).map((line, lineIndex) => (
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
                                            {toBullets(item.description).map((line, lineIndex) => (
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

export default React.memo(TemplateFour);
