import React from 'react';
import { Link } from 'react-router-dom';

const quickLinks = [
    { label: 'Home', to: '/' },
    { label: 'Services', to: '/?section=services' },
    { label: 'Contact', to: '/?section=contact' },
];

const resources = ['ATS Tips', 'Resume Templates', 'Career Blog', 'Interview Prep'];

function Footer() {
    return (
        <footer id="contact" className="mt-16 border-t border-border bg-[#b2f0e5] text-foreground">
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
                    <div className="font-ui-body mt-5 text-sm text-muted-foreground">
                        <p>Email: support@resumeatlas.ai</p>
                        <p>Phone: +1 (555) 948-1122</p>
                    </div>
                </div>
            </div>
            <div className="border-t border-border">
                <div className="font-ui-body mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                    <p>(c) {new Date().getFullYear()} Resume Atlas. All rights reserved.</p>
                    <p>Privacy Policy | Terms of Service</p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
