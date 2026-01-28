'use client';

import React, { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { DemographicData, AIFeedbackData, ApplicabilityData } from '@/lib/feedback-service';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

interface DashboardChartsProps {
    demographics: any[];
    aiFeedback: any[];
    applicability: any[];
}

export default function DashboardCharts({ demographics, aiFeedback, applicability }: DashboardChartsProps) {

    // 1. Demographics: Education Distribution
    const educationData = useMemo(() => {
        const counts: Record<string, number> = {};
        demographics.forEach((d: DemographicData) => {
            const edu = d.education || 'Unknown';
            counts[edu] = (counts[edu] || 0) + 1;
        });
        return {
            labels: Object.keys(counts),
            datasets: [{
                label: '# of Users',
                data: Object.values(counts),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                ],
                borderWidth: 1,
            }]
        };
    }, [demographics]);

    // 2. AI Feedback: Accuracy
    const aiAccuracyData = useMemo(() => {
        const counts: Record<string, number> = {};
        aiFeedback.forEach((d: AIFeedbackData) => {
            const acc = d.accuracy || 'Unknown';
            counts[acc] = (counts[acc] || 0) + 1;
        });
        return {
            labels: Object.keys(counts),
            datasets: [{
                label: 'Ratings',
                data: Object.values(counts),
                backgroundColor: 'rgba(153, 102, 255, 0.5)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1,
            }]
        };
    }, [aiFeedback]);

    // 3. Applicability: Time Savings
    const timeSavingsData = useMemo(() => {
        const counts: Record<string, number> = {};
        applicability.forEach((d: ApplicabilityData) => {
            // Parse 'X hours' or just take raw
            const val = d.timeSavings || 'N/A';
            counts[val] = (counts[val] || 0) + 1;
        });
        return {
            labels: Object.keys(counts),
            datasets: [{
                label: 'Responses',
                data: Object.values(counts),
                backgroundColor: 'rgba(255, 159, 64, 0.5)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }]
        };
    }, [applicability]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase">Education Level</h3>
                {demographics.length > 0 ? (
                    <Pie data={educationData} />
                ) : <p className="text-gray-400 italic">No data yet</p>}
            </div>

            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase">AI Accuracy Rating</h3>
                {aiFeedback.length > 0 ? (
                    <Bar options={{ indexAxis: 'y' as const }} data={aiAccuracyData} />
                ) : <p className="text-gray-400 italic">No data yet</p>}
            </div>

            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 md:col-span-2">
                <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase">Time Savings Estimate</h3>
                {applicability.length > 0 ? (
                    <Bar data={timeSavingsData} />
                ) : <p className="text-gray-400 italic">No data yet</p>}
            </div>
        </div>
    );
}
