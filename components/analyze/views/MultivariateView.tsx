import React, { useState } from 'react';
import { AnalysisStep } from '@/types/analysis';
import { getAnalysisCost, checkBalance, deductCredits } from '@/lib/ncs-credits';
import { logAnalysisUsage } from '@/lib/activity-logger';
import { runClusterAnalysis, runTwoWayANOVA } from '@/lib/webr-wrapper';

interface MultivariateViewProps {
    step: AnalysisStep;
    data: any[];
    columns: string[];
    allColumns?: string[];
    user: any;
    profile: any;
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

export const MultivariateView: React.FC<MultivariateViewProps> = ({
    step,
    data,
    columns,
    allColumns = [],
    user,
    profile,
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
    const [clusterVars, setClusterVars] = useState<{ k: number; variables: string[] }>({ k: 3, variables: [] });
    const [twoWayAnovaVars, setTwoWayAnovaVars] = useState<{ y: string; factor1: string; factor2: string }>({ y: '', factor1: '', factor2: '' });

    // Cluster Analysis Selection
    if (step === 'cluster-select') {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        Phân tích Cụm (Cluster Analysis)
                    </h2>
                    <p className="text-gray-600">
                        Phân nhóm/phân khúc đối tượng dựa trên sự tương đồng
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Chọn các biến để phân cụm (tối thiểu 2)
                            </label>
                            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                                {columns.map(col => (
                                    <label key={col} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                        <input
                                            type="checkbox"
                                            value={col}
                                            checked={clusterVars.variables.includes(col)}
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                setClusterVars(prev => ({
                                                    ...prev,
                                                    variables: isChecked
                                                        ? [...prev.variables, col]
                                                        : prev.variables.filter(v => v !== col)
                                                }));
                                            }}
                                            className="w-4 h-4 text-pink-600"
                                        />
                                        <span>{col}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Số cụm (k) - mặc định 3
                            </label>
                            <input
                                type="number"
                                min="2"
                                max="10"
                                value={clusterVars.k}
                                onChange={(e) => setClusterVars({ ...clusterVars, k: Number(e.target.value) || 3 })}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">Khuyến nghị: k = 2-5 cho hầu hết trường hợp</p>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            if (clusterVars.variables.length < 2) {
                                showToast('Vui lòng chọn ít nhất 2 biến để phân cụm', 'error');
                                return;
                            }
                            setIsAnalyzing(true);

                            // NCS Credit Check
                            if (user) {
                                const cost = await getAnalysisCost('regression'); // Use regression cost as default
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
                                const cols = clusterVars.variables;
                                const clusterData = data.map(row => cols.map(c => Number(row[c]) || 0));
                                const result = await runClusterAnalysis(clusterData, clusterVars.k, 'kmeans', cols);

                                // Deduct credits on success
                                if (user) {
                                    const cost = await getAnalysisCost('regression');
                                    await deductCredits(user.id, cost, `Cluster Analysis: ${clusterVars.k} clusters`);
                                    await logAnalysisUsage(user.id, 'cluster', cost);
                                    setNcsBalance(prev => Math.max(0, prev - cost));
                                }

                                setResults({ type: 'cluster', data: result, columns: cols });
                                setStep('results');
                                showToast('Phân tích Cluster hoàn thành!', 'success');
                            } catch (err: any) { showToast('Lỗi: ' + err.message || err, 'error'); }
                            finally { setIsAnalyzing(false); }
                        }}
                        disabled={isAnalyzing}
                        className="mt-6 w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg"
                    >
                        {isAnalyzing ? 'Đang phân tích...' : 'Chạy Cluster Analysis'}
                    </button>
                </div>

                <button onClick={() => setStep('analyze')} className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg">
                    ← Quay lại
                </button>
            </div>
        );
    }

    // Two-Way ANOVA Selection
    if (step === 'twoway-anova-select') {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        Two-Way ANOVA
                    </h2>
                    <p className="text-gray-600">
                        Phân tích phương sai 2 nhân tố (có xét tương tác)
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Biến phụ thuộc (Y - Metric)
                            </label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg"
                                value={twoWayAnovaVars.y}
                                onChange={(e) => setTwoWayAnovaVars({ ...twoWayAnovaVars, y: e.target.value })}
                            >
                                <option value="">Chọn biến...</option>
                                {columns.map(col => (
                                    <option key={col} value={col}>{col}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nhân tố 1 (Factor 1)
                                </label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={twoWayAnovaVars.factor1}
                                    onChange={(e) => setTwoWayAnovaVars(prev => ({ ...prev, factor1: e.target.value }))}
                                >
                                    <option value="">Chọn biến...</option>
                                    {varsForFactors.map(col => (
                                        <option key={col} value={col} disabled={twoWayAnovaVars.factor2 === col}>{col}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nhân tố 2 (Factor 2)
                                </label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={twoWayAnovaVars.factor2}
                                    onChange={(e) => setTwoWayAnovaVars(prev => ({ ...prev, factor2: e.target.value }))}
                                >
                                    <option value="">Chọn biến...</option>
                                    {varsForFactors.map(col => (
                                        <option key={col} value={col} disabled={twoWayAnovaVars.factor1 === col}>{col}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 italic">
                            Lưu ý: Hai nhân tố nên là biến định danh (categorical) với số lượng nhóm không quá lớn (ví dụ: Giới tính, Nhóm tuổi).
                        </p>
                    </div>

                    <button
                        onClick={async () => {
                            if (!twoWayAnovaVars.y || !twoWayAnovaVars.factor1 || !twoWayAnovaVars.factor2) {
                                showToast('Vui lòng chọn đủ 3 biến', 'error');
                                return;
                            }
                            setIsAnalyzing(true);

                            // NCS Credit Check
                            if (user) {
                                const cost = await getAnalysisCost('anova');
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
                                const yData = data.map(row => Number(row[twoWayAnovaVars.y]) || 0);
                                const f1Data = data.map(row => String(row[twoWayAnovaVars.factor1]));
                                const f2Data = data.map(row => String(row[twoWayAnovaVars.factor2]));

                                const result = await runTwoWayANOVA(yData, f1Data, f2Data, twoWayAnovaVars.factor1, twoWayAnovaVars.factor2, twoWayAnovaVars.y);

                                // Deduct credits on success
                                if (user) {
                                    const cost = await getAnalysisCost('anova');
                                    await deductCredits(user.id, cost, `Two-Way ANOVA: ${twoWayAnovaVars.y} ~ ${twoWayAnovaVars.factor1}*${twoWayAnovaVars.factor2}`);
                                    await logAnalysisUsage(user.id, 'anova', cost);
                                    setNcsBalance(prev => Math.max(0, prev - cost));
                                }

                                setResults({ type: 'twoway-anova', data: result, columns: [twoWayAnovaVars.y, twoWayAnovaVars.factor1, twoWayAnovaVars.factor2] });
                                setStep('results');
                                showToast('Phân tích Two-Way ANOVA hoàn thành!', 'success');
                            } catch (err: any) { showToast('Lỗi: ' + err.message || err, 'error'); }
                            finally { setIsAnalyzing(false); }
                        }}
                        disabled={isAnalyzing}
                        className="mt-6 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
                    >
                        {isAnalyzing ? 'Đang phân tích...' : 'Chạy Two-Way ANOVA'}
                    </button>
                </div>

                <button onClick={() => setStep('analyze')} className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg">
                    ← Quay lại
                </button>
            </div>
        );
    }

    return null;
};
