'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    BarChart2, Shield, Network, GitCompare, Layers, TrendingUp, Grid3x3,
    Activity, Binary, Target, ArrowRightLeft, Users, ChevronDown, ChevronRight,
    BookOpen, Code, ExternalLink, CircleDot, Server, Lock, CreditCard, FileDown
} from 'lucide-react';

interface Method {
    id: string;
    name: string;
    category: string;
    description: string;
    rFunction: string;
    whenToUse: string;
    assumptions?: string[];
    output: string[];
}

const METHODS: Method[] = [
    // Reliability & Descriptive
    {
        id: 'descriptive',
        name: 'Descriptive Statistics',
        category: 'Reliability & Descriptive',
        description: 'Calculate basic summary statistics for your data.',
        rFunction: 'psych::describe()',
        whenToUse: 'Always run first to understand data distribution and check for anomalies.',
        output: ['Mean, SD, Min, Max, Median', 'Skewness & Kurtosis', 'Missing value count']
    },
    {
        id: 'cronbach',
        name: "Cronbach's Alpha & McDonald's Omega",
        category: 'Reliability & Descriptive',
        description: "Assess internal consistency reliability of measurement scales.",
        rFunction: 'psych::alpha(), psych::omega()',
        whenToUse: 'When validating multi-item scales before further analysis.',
        assumptions: ['Items measure same construct', 'Likert-type scales'],
        output: ['Cronbach α coefficient', 'McDonald ω coefficient', 'Item-total correlations', 'Alpha if item deleted']
    },
    // Group Comparison
    {
        id: 'ttest',
        name: 'Independent Samples T-Test',
        category: 'Group Comparison',
        description: 'Compare means between two independent groups.',
        rFunction: 't.test(var.equal = FALSE)',
        whenToUse: 'Comparing two groups (e.g., male vs female, treatment vs control).',
        assumptions: ['Continuous dependent variable', 'Normal distribution or n > 30', 'Independent samples'],
        output: ['t-statistic, df, p-value', "Cohen's d effect size", "Welch's correction if variances unequal"]
    },
    {
        id: 'ttest-paired',
        name: 'Paired Samples T-Test',
        category: 'Group Comparison',
        description: 'Compare means for the same group at two time points.',
        rFunction: 't.test(paired = TRUE)',
        whenToUse: 'Before-after comparisons, matched pairs.',
        assumptions: ['Paired observations', 'Normal distribution of differences'],
        output: ['t-statistic, df, p-value', "Cohen's d effect size"]
    },
    // ... (Previous methods)
    {
        id: 'anova',
        name: 'One-Way ANOVA / Welch ANOVA',
        category: 'Group Comparison',
        description: 'Compare means across three or more groups.',
        rFunction: 'aov() or oneway.test()',
        whenToUse: 'Comparing multiple groups (e.g., education levels, age groups).',
        assumptions: ['Continuous DV', 'Normal distribution', 'Homogeneity of variance'],
        output: ['F-statistic, p-value', 'Eta-squared effect size', 'Welch correction']
    },
    {
        id: 'twoway-anova',
        name: 'Two-Way ANOVA',
        category: 'Group Comparison',
        description: 'Compare means with two factors and interaction effects.',
        rFunction: 'aov(y ~ x1 * x2)',
        whenToUse: 'Analyzing effect of two categorical variables and their interaction on a continuous DV.',
        assumptions: ['Normality', 'Homogeneity of variance', 'Independence'],
        output: ['Main effects F-tests', 'Interaction F-test', 'Interaction plot']
    },
    // ... (Non-parametric)
    // ... (Correlation)
    {
        id: 'moderation',
        name: 'Moderation Analysis',
        category: 'Correlation & Regression',
        description: 'Test if variable Z alters the relationship between X and Y.',
        rFunction: 'lm(y ~ x * z)',
        whenToUse: 'When the effect of X on Y depends on the level of Z.',
        output: ['Interaction term significance', 'Simple slopes', 'Johnson-Neyman interval']
    },
    // ... (SEM)
    // ... (Categorical)
    {
        id: 'fisher',
        name: "Fisher's Exact Test",
        category: 'Categorical',
        description: 'Exact test of independence for small samples.',
        rFunction: 'fisher.test()',
        whenToUse: 'Analyzing 2x2 tables where expected count < 5.',
        output: ['p-value (Exact)', 'Odds Ratio']
    },
    // Clustering
    {
        id: 'cluster',
        name: 'Cluster Analysis (K-Means)',
        category: 'Clustering & Segmentation',
        description: 'Group similar observations into clusters.',
        rFunction: 'stats::kmeans(), cluster::silhouette()',
        whenToUse: 'Market segmentation, profiling groups.',
        assumptions: ['Standardized variables', 'No outliers'],
        output: ['Cluster centers', 'Cluster membership', 'Silhouette score']
    }
];

const CATEGORIES = [
    { name: 'Reliability & Descriptive', color: 'blue', icon: Shield },
    { name: 'Group Comparison', color: 'green', icon: GitCompare },
    { name: 'Correlation & Regression', color: 'purple', icon: TrendingUp },
    { name: 'Factor Analysis & SEM', color: 'orange', icon: Layers },
    { name: 'Categorical', color: 'teal', icon: Grid3x3 },
    { name: 'Clustering & Segmentation', color: 'pink', icon: CircleDot }
];

export default function DocsPage() {
    const [expandedMethod, setExpandedMethod] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white px-6 py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-3 mb-2">
                        <BookOpen className="w-8 h-8" />
                        <h1 className="text-3xl font-bold">ncsStat Documentation</h1>
                    </div>
                    <p className="text-white/80">
                        Complete guide to 20+ statistical analysis methods and system features for PhD researchers
                    </p>
                </div>
            </div>

            {/* Intro - Hai Rong Choi */}
            <div className="max-w-5xl mx-auto px-6 pt-10 pb-4">
                <div className="bg-white rounded-2xl p-8 border border-indigo-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                            <span className="text-indigo-600">Hai Rong Choi</span> greets you.
                        </h3>
                        <div className="space-y-4 text-slate-700 leading-relaxed text-lg font-light">
                            <p>
                                Welcome to the sanctuary of rigorous analysis. This documentation is not merely a manual; it is a testament to the precision that defines <strong className="font-semibold text-slate-900">ncsStat</strong>.
                            </p>
                            <p>
                                Every function here has been battle-tested against standard academic benchmarks to ensure that your results are unassailable. Research is a lonely path, but here, you walk with certainty. Let us walk through the tools that will empower your thesis.
                            </p>
                        </div>
                    </div>
                    {/* Decorative Watermark */}
                    <div className="absolute -bottom-10 -right-10 text-slate-50 opacity-10 transform -rotate-12 pointer-events-none">
                        <Code className="w-64 h-64" />
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Quick Links */}
                <div className="bg-white rounded-xl border shadow-sm p-6 mb-8">
                    <h2 className="text-lg font-semibold mb-4">Quick Navigation</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {CATEGORIES.map(cat => (
                            <a
                                key={cat.name}
                                href={`#${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                                className={`flex items-center gap-2 p-3 rounded-lg border hover:shadow-md transition-all text-sm
                                    ${cat.color === 'blue' ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}
                                    ${cat.color === 'green' ? 'bg-green-50 border-green-200 text-green-700' : ''}
                                    ${cat.color === 'purple' ? 'bg-purple-50 border-purple-200 text-purple-700' : ''}
                                    ${cat.color === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-700' : ''}
                                    ${cat.color === 'teal' ? 'bg-teal-50 border-teal-200 text-teal-700' : ''}
                                `}
                            >
                                <cat.icon className="w-4 h-4" />
                                <span className="font-medium">{cat.name}</span>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Methods by Category */}
                {CATEGORIES.map(cat => (
                    <section key={cat.name} id={cat.name.toLowerCase().replace(/\s+/g, '-')} className="mb-8">
                        <h2 className={`text-xl font-bold mb-4 flex items-center gap-2
                            ${cat.color === 'blue' ? 'text-blue-700' : ''}
                            ${cat.color === 'green' ? 'text-green-700' : ''}
                            ${cat.color === 'purple' ? 'text-purple-700' : ''}
                            ${cat.color === 'orange' ? 'text-orange-700' : ''}
                            ${cat.color === 'teal' ? 'text-teal-700' : ''}
                        `}>
                            <cat.icon className="w-6 h-6" />
                            {cat.name}
                        </h2>

                        <div className="space-y-3">
                            {METHODS.filter(m => m.category === cat.name).map(method => (
                                <div
                                    key={method.id}
                                    className="bg-white rounded-lg border shadow-sm overflow-hidden"
                                >
                                    <button
                                        onClick={() => setExpandedMethod(
                                            expandedMethod === method.id ? null : method.id
                                        )}
                                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="text-left">
                                            <h3 className="font-semibold text-slate-800">{method.name}</h3>
                                            <p className="text-sm text-slate-500">{method.description}</p>
                                        </div>
                                        {expandedMethod === method.id ? (
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        )}
                                    </button>

                                    {expandedMethod === method.id && (
                                        <div className="px-5 pb-5 border-t bg-slate-50">
                                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                                <div>
                                                    <h4 className="font-medium text-slate-700 mb-2">When to Use</h4>
                                                    <p className="text-sm text-slate-600">{method.whenToUse}</p>
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                                                        <Code className="w-4 h-4" />
                                                        R Function
                                                    </h4>
                                                    <code className="text-sm bg-slate-800 text-green-400 px-2 py-1 rounded">
                                                        {method.rFunction}
                                                    </code>
                                                </div>
                                            </div>

                                            {method.assumptions && (
                                                <div className="mt-4">
                                                    <h4 className="font-medium text-slate-700 mb-2">Assumptions</h4>
                                                    <ul className="text-sm text-slate-600 list-disc list-inside">
                                                        {method.assumptions.map((a, i) => (
                                                            <li key={i}>{a}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="mt-4">
                                                <h4 className="font-medium text-slate-700 mb-2">Output</h4>
                                                <ul className="text-sm text-slate-600 list-disc list-inside">
                                                    {method.output.map((o, i) => (
                                                        <li key={i}>{o}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                ))}

                {/* System Features */}
                <div className="mt-16 bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-slate-50 p-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <Server className="w-6 h-6 text-indigo-600" />
                            System Architecture & Workflow
                        </h2>
                    </div>
                    <div className="p-6 grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                                <Code className="w-5 h-5 text-blue-500" />
                                WebR Technology
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                ncsStat runs R directly in your browser using <strong>WebAssembly (WASM)</strong>.
                                This means the R engine is downloaded once and executes locally on your machine.
                                <strong> No data is ever uploaded to our servers</strong> for analysis, ensuring absolute privacy.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                                <CreditCard className="w-5 h-5 text-green-500" />
                                Credits System
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Advanced analyses (like SEM, CFA) consume <strong>NCS Credits</strong>.
                                You receive 200 free credits upon registration. Additional credits can be obtained by
                                inviting colleagues or contacting support.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                                <Lock className="w-5 h-5 text-purple-500" />
                                Secure Authentication
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                We support secure login via Google and Email (Magic Link).
                                Your session is protected by Supabase Auth with RLS (Row Level Security)
                                ensuring only you can access your profile and history.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                                <FileDown className="w-5 h-5 text-orange-500" />
                                Persistence & Export
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Analysis results are stored locally in your browser (IndexedDB) so you can resume work later.
                                Reports can be exported to standardized PDF formats ready for thesis inclusion.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-sm text-slate-500 pb-8">
                    <p>
                        <strong>ncsStat</strong> - Professional statistical analysis for Vietnamese PhD researchers
                    </p>
                    <p className="mt-1">
                        Built with WebR (R in browser) • No data uploaded to server •
                        <Link href="/analyze" className="text-indigo-600 hover:underline ml-1">
                            Start Analyzing →
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
