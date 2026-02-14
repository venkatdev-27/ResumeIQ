import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail, Phone } from 'lucide-react';

const quickLinks = [
    { label: 'Home', to: '/' },
    { label: 'Services', to: '/?section=services' },
    { label: 'Templates', to: '/templates' },
];

const resources = ['ATS Tips', 'Resume Templates', 'Career Blog', 'Interview Prep'];
const socialLinks = [
    {
        label: 'Email',
        href: 'mailto:kosurivenky50@gmail.com',
        Icon: Mail,
    },
    {
        label: 'GitHub',
        href: 'https://github.com/venkatdev-27/ResumeIQ',
        Icon: Github,
    },
    {
        label: 'LinkedIn',
        href: 'https://linkedin.com/in/venkat18',
        Icon: Linkedin,
    },
];

function Footer() {
    return (
        <footer id="contact" className="mt-16 border-t border-[#d8e0ec] bg-[#f8fbff] text-foreground">
            <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
                <div>
                    <h3 className="font-ui-heading text-xl font-semibold text-foreground">Resume Atlas</h3>
                    <p className="font-ui-body mt-3 text-sm leading-6 text-muted-foreground">
                        ATS-first resume scanning with modern templates, matching insights, and practical improvements for every role.
                    </p>
                </div>

                <div>
                    <h4 className="font-ui-body text-sm font-semibold uppercase tracking-[0.15em] text-foreground">Quick Links</h4>
                    <ul className="mt-4 space-y-2 text-sm">
                        {quickLinks.map((link) => (
                            <li key={link.to}>
                                <Link to={link.to} className="font-ui-body text-muted-foreground transition hover:text-primary">
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h4 className="font-ui-body text-sm font-semibold uppercase tracking-[0.15em] text-foreground">Resources</h4>
                    <ul className="mt-4 space-y-2 text-sm">
                        {resources.map((resource) => (
                            <li key={resource} className="font-ui-body text-muted-foreground">
                                {resource}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-5">
                        <div className="flex items-center gap-3">
                            {socialLinks.map(({ label, href, Icon }) => (
                                <a
                                    key={label}
                                    href={href}
                                    target={label === 'Email' ? undefined : '_blank'}
                                    rel={label === 'Email' ? undefined : 'noreferrer'}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#cfd7e6] bg-white text-[#3d4b6d] transition hover:border-[#375cf6] hover:text-[#375cf6]"
                                    aria-label={label}
                                >
                                    <Icon className="h-4.5 w-4.5" />
                                </a>
                            ))}
                        </div>
                        <a
                            href="tel:7013269473"
                            className="font-ui-body mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"
                        >
                            <Phone className="h-4 w-4" />
                            <span>7013269473</span>
                        </a>
                    </div>
                </div>
            </div>
            <div className="border-t border-[#d8e0ec]">
                <div className="font-ui-body mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                    <p>(c) {new Date().getFullYear()} Resume Atlas. All rights reserved.</p>
                    <p>Privacy Policy | Terms of Service</p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
