import React, { useState } from 'react';
import { AnalysisStep } from '@/types/analysis';
import { getAnalysisCost, checkBalance, deductCredits } from '@/lib/ncs-credits';
import { logAnalysisUsage } from '@/lib/activity-logger';
import { runMediationAnalysis, runModerationAnalysis } from '@/lib/webr-wrapper';

interface MediationViewProps {
    step: AnalysisStep;
    data: any[];
    columns: string[];
    allColumns?: string[];
    user: any;
    setResults: (results: any) => void;
    setStep: (step: AnalysisStep) => void;
    setNcsBalance: React.Dispatch<React.SetStateAction<number>>;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;

    // Credit UI setters
    setRequiredCredits: (amount: number) => void;
    setCurrentAnalysisCost: (amount: number) => void;
    setShowInsufficientCredits: (show: boolean) => void;

    setAnalysisType?: (type: string) => void;
}

export const MediationView: React.FC<MediationViewProps> = ({
    step,
    data,
    columns,
    allColumns = [],
    user,
    setResults,
    setStep,
    setNcsBalance,
    showToast,
    setRequiredCredits,
    setCurrentAnalysisCost,
    setShowInsufficientCredits,
    setAnalysisType
}) => {
    const varsForFactors = allColumns.length > 0 ? allColumns : columns;
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Internal State
    const [mediationVars, setMediationVars] = useState<{ x: string; m: string; y: string }>({ x: '', m: '', y: '' });
    const [moderationVars, setModerationVars] = useState<{ x: string; w: string; y: string }>({ x: '', w: '', y: '' });

    // Mediation Selection
    if (step === 'mediation-select') {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        Phân tích Trung gian (Mediation)
                    </h2>
                    <p className="text-gray-600">
                        Kiểm tra biến M có đóng vai trò trung gian giữa X và Y không (Baron & Kenny)
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Biến độc lập (X - Predictor)
                            </label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg"
                                value={mediationVars.x}
                                onChange={(e) => setMediationVars({ ...mediationVars, x: e.target.value })}
                            >
                                <option value="">Chọn biến...</option>
                                {varsForFactors.map(col => (
                                    <option key={col} value={col} disabled={mediationVars.m === col || mediationVars.y === col}>{col}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Biến trung gian (M - Mediator)
                            </label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg"
                                value={mediationVars.m}
                                onChange={(e) => setMediationVars({ ...mediationVars, m: e.target.value })}
                            >
                                <option value="">Chọn biến...</option>
                                {varsForFactors.map(col => (
                                    <option key={col} value={col} disabled={mediationVars.x === col || mediationVars.y === col}>{col}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Biến phụ thuộc (Y - Outcome)
                            </label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg"
                                value={mediationVars.y}
                                onChange={(e) => setMediationVars({ ...mediationVars, y: e.target.value })}
                            >
                                <option value="">Chọn biến...</option>
                                {varsForFactors.map(col => (
                                    <option key={col} value={col} disabled={mediationVars.x === col || mediationVars.m === col}>{col}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            if (!mediationVars.x || !mediationVars.m || !mediationVars.y) {
                                showToast('Vui lòng chọn đủ 3 biến (X, M, Y)', 'error');
                                return;
                            }
                            setIsAnalyzing(true);

                            // NCS Credit Check
                            if (user) {
                                const cost = await getAnalysisCost('regression'); // Normally higher cost, but using regression for now
                                const hasEnough = await checkBalance(user.id, cost);
                                if (!hasEnough) {
                                    setRequiredCredits(cost);
                                    setCurrentAnalysisCost(cost);
                                    setShowInsufficientCredits(true);
                                    setIsAnalyzing(false);
                                    return;
                                }
                            }

                            try {
                                const cols = [mediationVars.x, mediationVars.m, mediationVars.y];
                                const mediationData = data.map(row => cols.map(c => Number(row[c]) || 0));

                                const result = await runMediationAnalysis(mediationData, cols, mediationVars.x, mediationVars.m, mediationVars.y);

                                // Deduct credits on success
                                if (user) {
                                    const cost = await getAnalysisCost('regression');
                                    await deductCredits(user.id, cost, `Mediation Analysis: ${mediationVars.x}->${mediationVars.m}->${mediationVars.y}`);
                                    await logAnalysisUsage(user.id, 'mediation', cost);
                                    setNcsBalance(prev => Math.max(0, prev - cost));
                                }

                                setResults({ type: 'mediation', data: result, columns: cols });
                                setStep('results');
                                showToast('Phân tích Mediation hoàn thành!', 'success');
                            } catch (err: any) { showToast('Lỗi: ' + err.message || err, 'error'); }
                            finally { setIsAnalyzing(false); }
                        }}
                        disabled={isAnalyzing}
                        className="mt-6 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg"
                    >
                        {isAnalyzing ? 'Đang phân tích...' : 'Chạy Mediation Analysis'}
                    </button>
                </div>

                <button
                    onClick={() => setStep('analyze')}
                    className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg"
                >
                    ← Quay lại
                </button>
            </div>
        );
    }

    // Moderation Selection
    if (step === 'moderation-select') {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        Phân tích Điều tiết (Moderation)
                    </h2>
                    <p className="text-gray-600">
                        Kiểm tra biến W có điều tiết mối quan hệ X → Y không
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Biến phụ thuộc (Y)
                            </label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg"
                                value={moderationVars.y}
                                onChange={(e) => setModerationVars({ ...moderationVars, y: e.target.value })}
                            >
                                <option value="">Chọn biến...</option>
                                {varsForFactors.map(col => (
                                    <option key={col} value={col} disabled={moderationVars.x === col || moderationVars.w === col}>{col}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Biến độc lập (X)
                            </label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg"
                                value={moderationVars.x}
                                onChange={(e) => setModerationVars({ ...moderationVars, x: e.target.value })}
                            >
                                <option value="">Chọn biến...</option>
                                {varsForFactors.map(col => (
                                    <option key={col} value={col} disabled={moderationVars.y === col || moderationVars.w === col}>{col}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Biến điều tiết (W / Moderator)
                            </label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg"
                                value={moderationVars.w}
                                onChange={(e) => setModerationVars(prev => ({ ...prev, w: e.target.value }))}
                            >
                                <option value="">Chọn biến...</option>
                                {varsForFactors.map(col => (
                                    <option key={col} value={col} disabled={moderationVars.y === col || moderationVars.x === col}>{col}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            if (!moderationVars.x || !moderationVars.w || !moderationVars.y) {
                                showToast('Vui lòng chọn đủ 3 biến (Y, X, W)', 'error');
                                return;
                            }
                            setIsAnalyzing(true);
                            // NCS Credit Check
                            if (user) {
                                const cost = await getAnalysisCost('regression');
                                const hasEnough = await checkBalance(user.id, cost);
                                if (!hasEnough) {
                                    setRequiredCredits(cost);
                                    setCurrentAnalysisCost(cost);
                                    setShowInsufficientCredits(true);
                                    setIsAnalyzing(false);
                                    return;
                                }
                            }

                            try {
                                const cols = [moderationVars.y, moderationVars.x, moderationVars.w];
                                const modData = data.map(row => cols.map(c => Number(row[c]) || 0));

                                const result = await runModerationAnalysis(modData, cols, moderationVars.x, moderationVars.w, moderationVars.y);

                                // Deduct credits on success
                                if (user) {
                                    const cost = await getAnalysisCost('regression');
                                    await deductCredits(user.id, cost, `Moderation: ${moderationVars.y} ~ ${moderationVars.x} * ${moderationVars.w}`);
                                    await logAnalysisUsage(user.id, 'moderation', cost);
                                    setNcsBalance(prev => Math.max(0, prev - cost));
                                }

                                setResults({ type: 'moderation', data: result, columns: cols });
                                setStep('results');
                                showToast('Phân tích Moderation hoàn thành!', 'success');
                            } catch (err: any) { showToast('Lỗi: ' + err.message || err, 'error'); }
                            finally { setIsAnalyzing(false); }
                        }}
                        disabled={isAnalyzing}
                        className="mt-6 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg"
                    >
                        {isAnalyzing ? 'Đang phân tích...' : 'Chạy Moderation Analysis'}
                    </button>
                </div>

                <button
                    onClick={() => setStep('analyze')}
                    className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg"
                >
                    ← Quay lại
                </button>
            </div>
        );
    }

    return null;
};
