import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BadgeCheck, BriefcaseBusiness, Clock3 } from 'lucide-react';
import { motion } from 'motion/react';
import { Accordion, AccordionButton, AccordionItem, AccordionPanel } from '@/components/animate-ui/components/headless/accordion';
import { ROUTES, TEMPLATE_OPTIONS } from '@/utils/constants';
import TemplateInlinePreview from '@/components/resume/TemplateInlinePreview';
import TemplatePreviewModal from '@/components/resume/TemplatePreviewModal';
import Footer from '../components/layout/Footer';
import Navbar from '../components/layout/Navbar';

const resumeIntroItems = [
    {
        title: 'ATS-Optimized Resume Templates',
        description: 'Choose recruiter-friendly templates built for clean parsing, professional layout consistency, and faster shortlisting.',
        icon: BadgeCheck,
        accent: 'bg-[#99ecb4]',
    },
    {
        title: 'Build Your Resume Faster',
        description: 'Use guided sections, live preview, and structured prompts to complete job-ready resumes in minutes.',
        icon: Clock3,
        accent: 'bg-[#d8def0]',
    },
    {
        title: 'AI ATS Score and Fixes',
        description: 'Scan your resume against job descriptions and get missing skills, keywords, and targeted improvements.',
        icon: BriefcaseBusiness,
        accent: 'bg-[#f5d9a1]',
    },
];

const accordionItems = [
    {
        title: 'Are resume templates free to use?',
        content:
            'Yes, our starter ATS templates are free and ready to use for freshers and experienced candidates. They follow clean layouts that are easier for most applicant tracking systems to parse. You can edit sections quickly and tailor each version for different jobs.',
    },
    {
        title: 'Can I check ATS score for free?',
        content:
            'Yes, you can run a free ATS score check to understand your current resume strength. The score highlights keyword match, section quality, and formatting clarity. You also get focused suggestions to improve before applying.',
    },
    {
        title: 'How is ATS score checked?',
        content:
            'The system compares your resume against job-specific keywords and role intent from the description. It also evaluates structure, readability, and section balance so important details are not missed by screening software. Final feedback shows practical fixes to improve match percentage.',
    },
];

const dummyAtsBreakdown = [
    { label: 'Keyword Match', score: 82 },
    { label: 'Formatting', score: 74 },
    { label: 'Section Completeness', score: 79 },
    { label: 'Impact Language', score: 71 },
];

const dummyPriorityActions = [
    {
        title: 'Strengthen profile summary',
        detail: 'Add target role, years of experience, and domain focus in the first 2 lines.',
    },
    {
        title: 'Quantify achievements',
        detail: 'Include numbers for growth, savings, delivery time, or conversion impact.',
    },
    {
        title: 'Improve keyword coverage',
        detail: 'Mirror core terms from the job description across experience and skills.',
    },
];

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useSelector((state) => state.auth);
    const [previewTemplate, setPreviewTemplate] = useState(null);

    useEffect(() => {
        const sectionId = new URLSearchParams(location.search).get('section');
        if (!sectionId) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const target = document.getElementById(sectionId);
        if (!target) {
            return;
        }

        const offsetTop = target.getBoundingClientRect().top + window.scrollY - 88;
        window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }, [location.search, location.pathname]);

    const visibleTemplates = useMemo(() => {
        const homeTemplateIds = ['template3', 'template9', 'template8', 'template1'];
        const selected = homeTemplateIds
            .map((id) => TEMPLATE_OPTIONS.find((template) => template.id === id))
            .filter(Boolean);

        return selected.length ? selected : TEMPLATE_OPTIONS.slice(0, 4);
    }, []);

    const handleStartTemplate = (templateId) => {
        setPreviewTemplate(null);
        navigate(`${ROUTES.resumeBuilder}?template=${templateId}`);
    };

    const getServiceLink = (target) => {
        if (target !== ROUTES.atsScanner || isAuthenticated) {
            return { to: target, state: undefined };
        }

        return {
            to: ROUTES.login,
            state: { from: { pathname: ROUTES.atsScanner } },
        };
    };
    const homeAtsLink = getServiceLink(ROUTES.atsScanner);

    return (
        <div className="min-h-screen bg-[#f1f2f4] text-[#2e2e2e] transition-colors duration-300">
            <Navbar />

            <main className="bg-[#f1f2f4]">
                <section id="home" className="border-y border-[#e2e3e7] bg-[#f1f2f4]">
                    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
                        <div className="inline-flex flex-wrap items-center gap-2 rounded-xl bg-[#e9eaef] px-3 py-2 text-[0.85rem] font-semibold text-[#2e2e2e] sm:text-[0.9rem]">
                            <span className="font-bold tracking-tight">EXCELLENT</span>
                            <span className="text-[#0f9d58]">Trustpilot 4.5/5</span>
                            <span className="font-medium text-[#3f3f46]">15,884 reviews</span>
                        </div>

                        <div className="mt-8 grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8">
                            <div className="max-w-[760px]">
                                <h1 className="font-ui-heading text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-[#0f0f10] sm:text-[2.7rem] lg:text-[4.6rem]">
                                    Build a job-winning resume
                                    <br />
                                    with ResumeIQ
                                </h1>
                                <div className="mt-1 h-[4px] w-[170px] rounded-full bg-[#90e2a7] sm:w-[225px]" />
                                <p className="resumeiq-mobile-lines mt-4 max-w-[700px] font-ui-body text-[1rem] leading-[1.55] text-[#2e2e2e] sm:text-[1.08rem]">
                                    ResumeIQ helps you create recruiter-ready resumes with less effort. Use ATS-friendly templates,
                                    guided writing prompts, and role-based suggestions. Optimize every section with smarter content,
                                    structure, and keyword matching. Build faster, apply confidently, and improve your interview chances.
                                </p>
                            </div>

                            <div className="flex w-full flex-col items-start gap-3 lg:mt-8 lg:w-auto lg:flex-row lg:items-center">
                                <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[450px]">
                                    <Link
                                        to={ROUTES.templates}
                                        className="inline-flex h-12 items-center justify-center rounded-full bg-[#375cf6] px-6 text-[0.98rem] font-bold text-white shadow-[0_8px_18px_rgba(55,92,246,0.28)] transition hover:bg-[#2f52e8]"
                                    >
                                        Create Resume
                                    </Link>
                                    <Link
                                        to={homeAtsLink.to}
                                        state={homeAtsLink.state}
                                        className="inline-flex h-12 items-center justify-center rounded-full border border-[#9ba7cf] bg-[#eceef2] px-6 text-[0.98rem] font-bold text-[#1f2a44] transition hover:bg-[#e3e7f1]"
                                    >
                                        Check ATS Score
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 grid gap-7 md:grid-cols-3 lg:mt-12">
                            {resumeIntroItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <article key={item.title} className="max-w-[340px]">
                                        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${item.accent}`}>
                                            <Icon className="h-6 w-6 text-[#18181b]" strokeWidth={2.15} />
                                        </div>
                                        <h3 className="mt-4 font-ui-heading text-[1.75rem] font-bold leading-[1.08] tracking-[-0.02em] text-[#111111] sm:text-[1.95rem]">
                                            {item.title}
                                        </h3>
                                        <p className="mt-3 font-ui-body text-[1rem] leading-[1.55] text-[#2e2e2e] sm:text-[1.05rem]">
                                            {item.description}
                                        </p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section id="templates" className="mx-auto max-w-6xl border-b border-[#e2e3e7] px-4 py-10 sm:px-6 lg:px-8">
                    <div className="mb-6 text-center">
                        <h2 className="font-ui-heading text-[2rem] text-[#111111] sm:text-[2.25rem]">Templates</h2>
                        <p className="font-ui-body mx-auto mt-2 max-w-2xl text-[0.95rem] text-[#4b4b53] sm:text-[1rem]">
                            Explore ATS-ready template layouts and pick the one that fits your profile style.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
                        {visibleTemplates.map((template) => (
                            <article key={template.id} className="group relative block transition hover:-translate-y-0.5">
                                <div className="overflow-hidden rounded-2xl">
                                    <TemplateInlinePreview templateId={template.id} />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setPreviewTemplate(template)}
                                    className="absolute bottom-3 left-1/2 inline-flex h-10 -translate-x-1/2 items-center justify-center rounded-full border border-[#e0b400] bg-[#facc15] px-7 text-sm font-bold text-slate-900 shadow-md"
                                >
                                    Preview
                                </button>
                            </article>
                        ))}
                    </div>

                    <div className="mt-6 flex justify-center">
                        <Link to={ROUTES.templates} className="font-ui-body text-sm font-semibold text-[#375cf6] underline-offset-4 hover:underline">
                            Show All Templates
                        </Link>
                    </div>
                </section>

                <section id="services" className="mx-auto max-w-6xl border-b border-[#e2e3e7] px-4 py-10 sm:px-6 lg:px-8">
                    <div className="mb-8 text-center">
                        <h2 className="font-ui-heading text-[2rem] text-[#111111] sm:text-[2.25rem]">Check ATS?</h2>
                        <p className="font-ui-body mx-auto mt-2 max-w-3xl text-[0.95rem] leading-7 text-[#4b4b53] sm:text-[1rem]">
                            See how your resume performs before you apply. Get a quick ATS score preview with missing keywords and focused fixes.
                        </p>
                    </div>

                    <div id="ats-scanner" className="grid gap-8 border-t border-[#d5d9e1] pt-8 md:grid-cols-[1.1fr_1fr] md:gap-10">
                        <div>
                            <p className="font-ui-body text-[0.82rem] font-semibold uppercase tracking-[0.14em] text-[#4b5db0]">Dummy ATS Result</p>
                            <div className="mt-3 flex items-end gap-2">
                                <motion.span
                                    initial={{ opacity: 0, y: 12 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.55 }}
                                    transition={{ duration: 0.45, ease: 'easeOut' }}
                                    className="font-ui-heading text-[3.1rem] font-extrabold leading-none text-[#111111]"
                                >
                                    78
                                </motion.span>
                                <span className="pb-2 text-[1rem] font-semibold text-[#4b4b53]">/ 100</span>
                            </div>

                            <div className="mt-4 h-4 overflow-hidden rounded-full bg-[#d9deea]">
                                <div className="relative h-full w-[78%] overflow-hidden rounded-full bg-[#375cf6]">
                                    <motion.span
                                        initial={{ left: '-20%' }}
                                        animate={{ left: '110%' }}
                                        transition={{ duration: 1.7, ease: 'linear', repeat: Infinity }}
                                        className="absolute inset-y-0 w-14 -skew-x-12 bg-white/40 blur-[0.5px]"
                                    />
                                </div>
                            </div>
                            <p className="mt-3 text-[0.95rem] text-[#3e3e44]">Good start. Improve keyword coverage and quantified impact to reach 90+.</p>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <h3 className="font-ui-heading text-[1.2rem] text-[#111111] sm:text-[1.3rem]">Score Breakdown</h3>
                                <ul className="mt-3 space-y-3">
                                    {dummyAtsBreakdown.map((item) => (
                                        <li key={item.label} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-[0.9rem] font-semibold text-[#2f3b5e]">
                                                <span>{item.label}</span>
                                                <span>{item.score}%</span>
                                            </div>
                                            <div className="h-2.5 overflow-hidden rounded-full bg-[#d9deea]">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${item.score}%` }}
                                                    viewport={{ once: true, amount: 0.25 }}
                                                    transition={{ duration: 0.65, ease: 'easeOut' }}
                                                    className="h-full rounded-full bg-[#4f67ff]"
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-ui-heading text-[1.2rem] text-[#111111] sm:text-[1.3rem]">Priority Actions</h3>
                                <ul className="mt-3 space-y-3">
                                    {dummyPriorityActions.map((item, index) => (
                                        <li key={item.title} className="border-b border-[#d5d9e1] pb-3 last:border-b-0 last:pb-0">
                                            <div className="flex items-start gap-3">
                                                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dfe6ff] text-[0.8rem] font-bold text-[#2f52e8]">
                                                    {index + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-[0.95rem] font-semibold text-[#1f2a44]">{item.title}</p>
                                                    <p className="mt-1 text-[0.9rem] leading-6 text-[#4b4b53]">{item.detail}</p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <Link
                            to={homeAtsLink.to}
                            state={homeAtsLink.state}
                            className="inline-flex h-12 items-center justify-center rounded-full bg-[#375cf6] px-7 text-[0.98rem] font-bold text-white shadow-[0_8px_18px_rgba(55,92,246,0.28)] transition hover:bg-[#2f52e8]"
                        >
                            Check ATS Score
                        </Link>
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                    <div className="rounded-2xl border border-[#d9dde4] bg-[#eceef2] p-6 sm:p-8">
                        <h2 className="font-ui-heading text-[2rem] text-[#111111] sm:text-[2.25rem]">Why Choose Us</h2>
                        <p className="font-ui-body mt-2 text-[0.95rem] text-[#4b4b53] sm:text-[1rem]">
                            Helpful answers about free templates, ATS score checking, and how the scoring process works.
                        </p>
                        <Accordion className="mt-6 w-full">
                            {accordionItems.map((item) => (
                                <AccordionItem key={item.title} className="border-[#d0d4dc]">
                                    <AccordionButton
                                        showArrow
                                        className="font-ui-body rounded-xl px-4 py-4 text-[1rem] text-[#111111] hover:no-underline hover:bg-[#e3e7f1] sm:text-[1.05rem]"
                                    >
                                        {item.title}
                                    </AccordionButton>
                                    <AccordionPanel
                                        keepRendered
                                        className="font-ui-body px-4 pb-4 text-[0.96rem] leading-6 text-[#4b4b53] sm:text-[1rem]"
                                    >
                                        {item.content}
                                    </AccordionPanel>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </section>

            </main>

            <Footer />

            <TemplatePreviewModal
                open={Boolean(previewTemplate)}
                template={previewTemplate}
                onClose={() => setPreviewTemplate(null)}
                selectedTemplateId={null}
                onUseTemplate={handleStartTemplate}
                actionLabel="Start"
                useSelectedState={false}
            />
        </div>
    );
};

export default Home;
