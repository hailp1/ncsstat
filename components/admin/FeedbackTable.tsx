'use client';

import React from 'react';

interface FeedbackTableProps {
    data: any[];
    type: 'demographics' | 'aiFeedback' | 'applicability';
}

export default function FeedbackTable({ data, type }: FeedbackTableProps) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 italic bg-gray-50 rounded border border-dashed border-gray-300">
                No records found.
            </div>
        );
    }

    // Helper to safely render cell
    const renderCell = (val: any) => {
        if (typeof val === 'object') return JSON.stringify(val);
        if (!val) return '-';
        return String(val);
    };

    return (
        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                        {/* Dynamic Headers based on Type */}
                        {type === 'demographics' && (
                            <>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Education</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                            </>
                        )}
                        {type === 'aiFeedback' && (
                            <>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Format Score</th>
                            </>
                        )}
                        {type === 'applicability' && (
                            <>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Utility</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Time Saved</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {data.map((row, idx) => {
                        const date = row.timestamp ? new Date(row.timestamp).toLocaleString() : 'N/A';
                        const uid = row.userId ? row.userId.slice(0, 8) + '...' : 'Anon';

                        return (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-gray-600">{date}</td>
                                <td className="px-4 py-3 font-mono text-xs text-blue-600">{uid}</td>

                                {type === 'demographics' && (
                                    <>
                                        <td className="px-4 py-3">{renderCell(row.role)}</td>
                                        <td className="px-4 py-3">{renderCell(row.education)}</td>
                                        <td className="px-4 py-3">{renderCell(row.experience)}</td>
                                    </>
                                )}

                                {type === 'aiFeedback' && (
                                    <>
                                        <td className="px-4 py-3">{renderCell(row.testType)}</td>
                                        <td className="px-4 py-3 font-medium">{renderCell(row.accuracy)}</td>
                                        <td className="px-4 py-3">{renderCell(row.formatting)}/5</td>
                                    </>
                                )}

                                {type === 'applicability' && (
                                    <>
                                        <td className="px-4 py-3">{renderCell(row.manuscriptUtility)}</td>
                                        <td className="px-4 py-3">{renderCell(row.timeSavings)}</td>
                                        <td className="px-4 py-3 text-xs max-w-xs truncate" title={row.openFeedback}>{renderCell(row.openFeedback)}</td>
                                    </>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
