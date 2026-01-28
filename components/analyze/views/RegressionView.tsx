import React, { useState } from 'react';
import { AnalysisStep } from '@/types/analysis';
import { getAnalysisCost, checkBalance, deductCredits } from '@/lib/ncs-credits';
import { logAnalysisUsage } from '@/lib/activity-logger';
import { runLinearRegression, runLogisticRegression } from '@/lib/webr-wrapper';

interface RegressionViewProps {
    step: AnalysisStep;
    data: any[];
    columns: string[];
    user: any;
    setResults: (results: any) => void;
    setStep: (step: AnalysisStep) => void;
    setNcsBalance: React.Dispatch<React.SetStateAction<number>>;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;

    // Credit UI setters passed from parent to handle "Insufficient Credits" modal
    setRequiredCredits: (amount: number) => void;
    setCurrentAnalysisCost: (amount: number) => void;
    setShowInsufficientCredits: (show: boolean) => void;

    // Optional setter to update analysis type in parent
    setAnalysisType?: (type: string) => void;
}

export const RegressionView: React.FC<RegressionViewProps> = ({
    step,
    data,
    columns,
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
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Internal State
    const [regressionVars, setRegressionVars] = useState<{ y: string; xs: string[] }>({ y: '', xs: [] });
    const [logisticVars, setLogisticVars] = useState<{ y: string; xs: string[] }>({ y: '', xs: [] });

    if (step === 'regression-select') {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        Hồi quy Tuyến tính Đa biến
                    </h2>
                    <p className="text-gray-600">
                        Chọn 1 biến phụ thuộc (Y) và các biến độc lập (X)
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border">
                    <div className="space-y-6">
                        {/* Dependent Variable (Y) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Biến phụ thuộc (Y) - Chọn 1
                            </label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg"
                                value={regressionVars.y}
                                onChange={(e) => setRegressionVars({ ...regressionVars, y: e.target.value })}
                            >
                                <option value="">Chọn biến...</option>
                                {columns.map(col => (
                                    <option key={col} value={col} disabled={regressionVars.xs.includes(col)}>
                                        {col}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Independent Variables (Xs) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Biến độc lập (X) - Chọn nhiều
                            </label>
                            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto border rounded-lg p-2">
                                {columns.map(col => (
                                    <label key={col} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                        <input
                                            type="checkbox"
                                            value={col}
                                            disabled={regressionVars.y === col}
                                            checked={regressionVars.xs.includes(col)}
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                setRegressionVars(prev => ({
                                                    ...prev,
                                                    xs: isChecked
                                                        ? [...prev.xs, col]
                                                        : prev.xs.filter(x => x !== col)
                                                }));
                                            }}
                                            className="w-4 h-4 text-pink-600"
                                        />
                                        <span className={regressionVars.y === col ? 'text-gray-400' : ''}>{col}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            if (!regressionVars.y) { showToast('Vui lòng chọn biến phụ thuộc (Y)', 'error'); return; }
                            if (regressionVars.xs.length === 0) { showToast('Vui lòng chọn ít nhất 1 biến độc lập (X)', 'error'); return; }

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
                                const cols = [regressionVars.y, ...regressionVars.xs];
                                const regData = data.map(row =>
                                    cols.map(c => Number(row[c]) || 0)
                                );

                                const result = await runLinearRegression(regData, cols);
                                // Deduct credits on success
                                if (user) {
                                    const cost = await getAnalysisCost('regression');
                                    await deductCredits(user.id, cost, `Regression: Y=${regressionVars.y}`);
                                    await logAnalysisUsage(user.id, 'regression', cost);
                                    setNcsBalance(prev => Math.max(0, prev - cost));
                                }

                                setResults({ type: 'regression', data: result, columns: cols });
                                setStep('results');
                                showToast('Phân tích Hồi quy hoàn thành!', 'success');
                            } catch (err: any) { showToast('Lỗi: ' + err.message || err, 'error'); }
                            finally { setIsAnalyzing(false); }
                        }}
                        disabled={isAnalyzing}
                        className="mt-6 w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg"
                    >
                        {isAnalyzing ? 'Đang phân tích...' : 'Chạy Hồi quy'}
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

    if (step === 'logistic-select') {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        Hồi quy Logistic (Nhị phân)
                    </h2>
                    <p className="text-gray-600">
                        Dự đoán biến phụ thuộc nhị phân (0/1 hoặc Yes/No)
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Biến phụ thuộc (Y) - Phải là nhị phân (0/1)
                            </label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg"
                                value={logisticVars.y}
                                onChange={(e) => setLogisticVars({ ...logisticVars, y: e.target.value })}
                            >
                                <option value="">Chọn biến...</option>
                                {columns.map(col => (
                                    <option key={col} value={col} disabled={logisticVars.xs.includes(col)}>{col}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Lưu ý: Biến Y chỉ nên chứa 2 giá trị (ví dụ: 0 và 1)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Các biến độc lập (X1, X2...)
                            </label>
                            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                                {columns.map(col => (
                                    <label key={col} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                        <input
                                            type="checkbox"
                                            value={col}
                                            checked={logisticVars.xs.includes(col)}
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                setLogisticVars(prev => ({
                                                    ...prev,
                                                    xs: isChecked
                                                        ? [...prev.xs, col]
                                                        : prev.xs.filter(v => v !== col)
                                                }));
                                            }}
                                            disabled={logisticVars.y === col}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <span>{col}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            if (!logisticVars.y) { showToast('Vui lòng chọn biến phụ thuộc (Y)', 'error'); return; }
                            if (logisticVars.xs.length === 0) { showToast('Vui lòng chọn ít nhất 1 biến độc lập (X)', 'error'); return; }

                            setIsAnalyzing(true);

                            // NCS Credit Check
                            if (user) {
                                const cost = await getAnalysisCost('regression'); // Use regression cost for logistic too
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
                                const cols = [logisticVars.y, ...logisticVars.xs];
                                const logData = data.map(row => cols.map(c => Number(row[c]) || 0));

                                const result = await runLogisticRegression(logData, cols);

                                // Deduct credits on success
                                if (user) {
                                    const cost = await getAnalysisCost('regression');
                                    await deductCredits(user.id, cost, `Logistic Regression: Y=${logisticVars.y}`);
                                    await logAnalysisUsage(user.id, 'regression', cost);
                                    setNcsBalance(prev => Math.max(0, prev - cost));
                                }

                                setResults({ type: 'logistic', data: result, columns: cols });
                                setStep('results');
                                showToast('Phân tích Logistic hoàn thành!', 'success');
                            } catch (err: any) { showToast('Lỗi: ' + err.message || err, 'error'); }
                            finally { setIsAnalyzing(false); }
                        }}
                        disabled={isAnalyzing}
                        className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                    >
                        {isAnalyzing ? 'Đang phân tích...' : 'Chạy Logistic Regression'}
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
