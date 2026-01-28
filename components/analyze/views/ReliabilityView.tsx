import React, { useState } from 'react';
import { AnalysisStep } from '@/types/analysis';
import { getAnalysisCost, checkBalance, deductCredits } from '@/lib/ncs-credits';
import { logAnalysisUsage } from '@/lib/activity-logger';
import { runCronbachAlpha, runEFA, runCFA, runSEM } from '@/lib/webr-wrapper';
import { SmartGroupSelector } from '@/components/VariableSelector';
import CFASelection from '@/components/CFASelection';
import SEMSelection from '@/components/SEMSelection';

interface ReliabilityViewProps {
    step: AnalysisStep;
    data: any[];
    columns: string[];
    user: any;
    setResults: (results: any) => void;
    setStep: (step: AnalysisStep) => void;
    setNcsBalance: React.Dispatch<React.SetStateAction<number>>;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;

    // Specific Setters for App State
    setScaleName: (name: string) => void;
    setMultipleResults: (results: any[]) => void;
    setAnalysisType: (type: string) => void;

    // Credit UI setters
    setRequiredCredits: (amount: number) => void;
    setCurrentAnalysisCost: (amount: number) => void;
    setShowInsufficientCredits: (show: boolean) => void;

    // Helper from parent to handle common WebR errors if needed, or define locally
    // We'll define error handler locally to be self-contained or import if it was shared.
    // It was locally defined in page.tsx. I'll reproduce it or a simplified version.
}

export const ReliabilityView: React.FC<ReliabilityViewProps> = ({
    step,
    data,
    columns,
    user,
    setResults,
    setStep,
    setNcsBalance,
    showToast,
    setScaleName,
    setMultipleResults,
    setAnalysisType,
    setRequiredCredits,
    setCurrentAnalysisCost,
    setShowInsufficientCredits
}) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalysisError = (err: any) => {
        const msg = err.message || String(err);
        console.error("Analysis Error:", err);
        showToast(`Lỗi: ${msg.substring(0, 100)}...`, 'error');
    };

    // --- Logic for Cronbach/Omega ---

    const runCronbachWithSelection = async (selectedColumns: string[], name: string) => {
        if (selectedColumns.length < 2) {
            showToast('Cronbach Alpha cần ít nhất 2 biến', 'error');
            return;
        }

        // NCS Credit Check
        if (user) {
            const cost = await getAnalysisCost('cronbach');
            const hasEnough = await checkBalance(user.id, cost);
            if (!hasEnough) {
                setRequiredCredits(cost);
                setCurrentAnalysisCost(cost);
                setShowInsufficientCredits(true);
                return;
            }
        }

        setIsAnalyzing(true);
        setAnalysisType('cronbach');
        setScaleName(name);
        setMultipleResults([]);

        try {
            const selectedData = data.map(row =>
                selectedColumns.map(col => Number(row[col]) || 0)
            );

            const analysisResults = await runCronbachAlpha(selectedData);

            if (user) {
                const cost = await getAnalysisCost('cronbach');
                await deductCredits(user.id, cost, `Cronbach Alpha: ${name}`);
                await logAnalysisUsage(user.id, 'cronbach', cost);
                setNcsBalance(prev => Math.max(0, prev - cost));
            }

            setResults({
                type: 'cronbach',
                data: analysisResults,
                columns: selectedColumns,
                scaleName: name
            });
            setStep('results');
            showToast('Phân tích hoàn thành!', 'success');
        } catch (error) {
            handleAnalysisError(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const runCronbachBatch = async (groups: { name: string; columns: string[] }[]) => {
        for (const group of groups) {
            if (group.columns.length < 2) {
                showToast(`Nhóm "${group.name}" cần ít nhất 2 biến`, 'error');
                return;
            }
        }

        if (user) {
            const singleCost = await getAnalysisCost('cronbach');
            const totalCost = singleCost * groups.length;
            const hasEnough = await checkBalance(user.id, totalCost);

            if (!hasEnough) {
                setRequiredCredits(totalCost);
                setCurrentAnalysisCost(totalCost);
                setShowInsufficientCredits(true);
                return;
            }
        }

        setIsAnalyzing(true);
        setAnalysisType('cronbach-batch');
        setResults(null);
        setMultipleResults([]);

        try {
            const allResults = [];
            for (const group of groups) {
                const groupData = data.map(row =>
                    group.columns.map(col => Number(row[col]) || 0)
                );
                const result = await runCronbachAlpha(groupData);
                allResults.push({
                    scaleName: group.name,
                    columns: group.columns,
                    data: result
                });
            }

            if (user) {
                const singleCost = await getAnalysisCost('cronbach');
                const totalCost = singleCost * groups.length;
                await deductCredits(user.id, totalCost, `Batch Cronbach: ${groups.length} scales`);
                await logAnalysisUsage(user.id, 'cronbach-batch', totalCost);
                setNcsBalance(prev => Math.max(0, prev - totalCost));
            }

            setMultipleResults(allResults);
            setStep('results');
            await new Promise(r => setTimeout(r, 100));
            showToast(`Phân tích ${allResults.length} thang đo hoàn thành!`, 'success');
        } catch (error) {
            handleAnalysisError(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const runOmegaWithSelection = async (selectedColumns: string[], name: string) => {
        if (selectedColumns.length < 3) {
            showToast('McDonald\'s Omega cần ít nhất 3 biến', 'error');
            return;
        }

        if (user) {
            const cost = await getAnalysisCost('omega');
            const hasEnough = await checkBalance(user.id, cost);
            if (!hasEnough) {
                setRequiredCredits(cost);
                setCurrentAnalysisCost(cost);
                setShowInsufficientCredits(true);
                return;
            }
        }

        setIsAnalyzing(true);
        setAnalysisType('omega');
        setScaleName(name);
        setMultipleResults([]);

        try {
            const selectedData = data.map(row =>
                selectedColumns.map(col => Number(row[col]) || 0)
            );
            // Calling runCronbachAlpha is correct? 
            // Wrapper 'runCronbachAlpha' returns alpha, but does it return omega?
            // Checking webr-wrapper: runCronbachAlpha returns { alpha, rawAlpha, stdAlpha, ... }
            // 'omega' usually requires 'psych::omega'.
            // The existing page.tsx implementation called `runCronbachAlpha(selectedData)` for Omega too!
            // Wait, I should double check that. Line 608: `const analysisResults = await runCronbachAlpha(selectedData);`
            // Yes, it seems the current implementation uses Cronbach function for Omega? That might be a bug or placeholder.
            // But since I'm refactoring, I should preserve existing behavior unless I fix it.
            // I will PRESREVE existing behavior but note it.
            const analysisResults = await runCronbachAlpha(selectedData);

            if (user) {
                const cost = await getAnalysisCost('omega');
                await deductCredits(user.id, cost, `McDonald's Omega: ${name}`);
                await logAnalysisUsage(user.id, 'omega', cost);
                setNcsBalance(prev => Math.max(0, prev - cost));
            }

            setResults({
                type: 'omega',
                data: analysisResults,
                columns: selectedColumns,
                scaleName: name
            });
            setStep('results');
            showToast('Phân tích Omega hoàn thành!', 'success');
        } catch (error) {
            handleAnalysisError(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const runOmegaBatch = async (groups: { name: string; columns: string[] }[]) => {
        for (const group of groups) {
            if (group.columns.length < 3) {
                showToast(`Nhóm "${group.name}" cần ít nhất 3 biến cho Omega`, 'error');
                return;
            }
        }

        if (user) {
            const singleCost = await getAnalysisCost('omega');
            const totalCost = singleCost * groups.length;
            const hasEnough = await checkBalance(user.id, totalCost);

            if (!hasEnough) {
                setRequiredCredits(totalCost);
                setCurrentAnalysisCost(totalCost);
                setShowInsufficientCredits(true);
                return;
            }
        }

        setIsAnalyzing(true);
        setAnalysisType('omega-batch');
        setResults(null);
        setMultipleResults([]);

        try {
            const allResults = [];
            for (const group of groups) {
                const groupData = data.map(row =>
                    group.columns.map(col => Number(row[col]) || 0)
                );
                // Also using runCronbachAlpha per existing code
                const result = await runCronbachAlpha(groupData);
                allResults.push({
                    scaleName: group.name,
                    columns: group.columns,
                    data: result
                });
            }

            if (user) {
                const singleCost = await getAnalysisCost('omega');
                const totalCost = singleCost * groups.length;
                await deductCredits(user.id, totalCost, `Batch Omega: ${groups.length} scales`);
                await logAnalysisUsage(user.id, 'omega-batch', totalCost);
                setNcsBalance(prev => Math.max(0, prev - totalCost));
            }

            setMultipleResults(allResults);
            setStep('results');
            await new Promise(r => setTimeout(r, 100));
            showToast(`Phân tích Omega ${allResults.length} thang đo hoàn thành!`, 'success');
        } catch (error) {
            handleAnalysisError(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // --- Render ---

    // Cronbach
    if (step === 'cronbach-select') {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        Cronbach&apos;s Alpha
                    </h2>
                    <p className="text-gray-600">
                        Tự động nhận diện và gom nhóm biến theo tên (VD: SAT1, SAT2 → SAT)
                    </p>
                </div>

                <SmartGroupSelector
                    columns={columns}
                    onAnalyzeGroup={runCronbachWithSelection}
                    onAnalyzeAllGroups={runCronbachBatch}
                    isAnalyzing={isAnalyzing}
                />

                <button
                    onClick={() => setStep('analyze')}
                    className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                >
                    ← Quay lại chọn phương pháp
                </button>

                {isAnalyzing && (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                        <p className="mt-4 text-gray-600">Đang phân tích...</p>
                    </div>
                )}
            </div>
        );
    }

    // Omega
    if (step === 'omega-select') {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        McDonald&apos;s Omega
                    </h2>
                    <p className="text-gray-600">
                        Đánh giá độ tin cậy thang đo (Độ chính xác cao hơn Alpha)
                    </p>
                </div>

                <SmartGroupSelector
                    columns={columns}
                    onAnalyzeGroup={runOmegaWithSelection}
                    onAnalyzeAllGroups={runOmegaBatch}
                    isAnalyzing={isAnalyzing}
                    minItemsPerGroup={3}
                    analysisLabel="McDonald's Omega"
                />

                <button
                    onClick={() => setStep('analyze')}
                    className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                >
                    ← Quay lại chọn phương pháp
                </button>

                {isAnalyzing && (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                        <p className="mt-4 text-gray-600">Đang phân tích Omega...</p>
                    </div>
                )}
            </div>
        );
    }

    // EFA
    if (step === 'efa-select') {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        Exploratory Factor Analysis (EFA)
                    </h2>
                    <p className="text-gray-600">
                        Phân tích nhân tố khám phá
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-gray-600">
                            Chọn các biến để phân tích nhân tố:
                        </p>
                        <div className="space-x-2">
                            <button
                                onClick={() => {
                                    const checkboxes = document.querySelectorAll('.efa-checkbox') as NodeListOf<HTMLInputElement>;
                                    checkboxes.forEach(cb => cb.checked = true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Chọn tất cả
                            </button>
                            <button
                                onClick={() => {
                                    const checkboxes = document.querySelectorAll('.efa-checkbox') as NodeListOf<HTMLInputElement>;
                                    checkboxes.forEach(cb => cb.checked = false);
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                            >
                                Bỏ chọn
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                        {columns.map(col => (
                            <label key={col} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                <input
                                    type="checkbox"
                                    value={col}
                                    defaultChecked={true}
                                    className="efa-checkbox w-4 h-4 text-orange-600"
                                />
                                <span>{col}</span>
                            </label>
                        ))}
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Số nhân tố dự kiến (Tùy chọn)
                        </label>
                        <input
                            type="number"
                            id="efa-nfactors"
                            className="w-full px-3 py-2 border rounded-lg"
                            placeholder="Để trống = Tự động (Eigenvalues > 1)"
                            min={1}
                            max={10}
                        />
                        <p className="text-xs text-slate-500 mt-1 italic">
                            Nếu bỏ trống, hệ thống sẽ tự đề xuất số lượng nhân tố dựa trên hệ số Eigenvalue {'>'} 1 (Kaiser Criterion).
                        </p>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phép quay (Rotation)
                        </label>
                        <select
                            id="efa-rotation"
                            className="w-full px-3 py-2 border rounded-lg bg-white"
                            defaultValue="varimax"
                        >
                            <option value="none">Không quay (None)</option>
                            <option value="varimax">Vuông góc (Varimax) - Đề xuất</option>
                            <option value="promax">Xiên (Promax)</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1 italic">
                            Varimax giúp phân định rõ nhân tố. Promax phù hợp nếu các nhân tố có tương quan.
                        </p>
                    </div>

                    <button
                        onClick={async () => {
                            const checkboxes = document.querySelectorAll('.efa-checkbox:checked') as NodeListOf<HTMLInputElement>;
                            const selectedCols = Array.from(checkboxes).map(cb => cb.value);
                            const factorInput = (document.getElementById('efa-nfactors') as HTMLInputElement).value;
                            const rotationInput = (document.getElementById('efa-rotation') as HTMLSelectElement).value;
                            const nfactors = factorInput ? parseInt(factorInput) : 0;

                            if (selectedCols.length < 3) {
                                showToast('Cần chọn ít nhất 3 biến để phân tích EFA', 'error');
                                return;
                            }

                            if (nfactors > 0 && nfactors > selectedCols.length / 2) {
                                showToast('Số nhân tố không nên lớn hơn số biến / 2', 'error');
                                return;
                            }

                            setIsAnalyzing(true);
                            setAnalysisType('efa');

                            if (user) {
                                const cost = await getAnalysisCost('efa');
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
                                const efaData = data.map(row =>
                                    selectedCols.map(col => Number(row[col]) || 0)
                                );
                                const result = await runEFA(efaData, nfactors, rotationInput);

                                if (user) {
                                    const cost = await getAnalysisCost('efa');
                                    await deductCredits(user.id, cost, `EFA: ${nfactors || 'Auto'} factors`);
                                    await logAnalysisUsage(user.id, 'efa', cost);
                                    setNcsBalance(prev => Math.max(0, prev - cost));
                                }

                                setResults({ type: 'efa', data: result, columns: selectedCols });
                                setStep('results');
                                showToast('Phân tích EFA hoàn thành!', 'success');
                            } catch (err: any) {
                                showToast('Lỗi EFA: ' + err.message || err, 'error');
                            }
                            finally { setIsAnalyzing(false); }
                        }}
                        disabled={isAnalyzing}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg"
                    >
                        {isAnalyzing ? 'Đang phân tích...' : 'Chạy EFA'}
                    </button>
                </div>

                <button
                    onClick={() => setStep('analyze')}
                    className="w-full py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                    ← Quay lại chọn phép tính
                </button>
            </div>
        );
    }

    // CFA
    if (step === 'cfa-select') {
        return (
            <CFASelection
                columns={columns}
                onRunCFA={async (syntax, factors) => {
                    setIsAnalyzing(true);
                    setAnalysisType('cfa');

                    if (user) {
                        const cost = await getAnalysisCost('cfa');
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
                        const neededCols: string[] = Array.from(new Set(factors.flatMap((f: any) => f.indicators)));
                        const cfaData = data.map(row => neededCols.map((c: string) => Number(row[c]) || 0));

                        const result = await runCFA(cfaData, neededCols, syntax);

                        if (user) {
                            const cost = await getAnalysisCost('cfa');
                            await deductCredits(user.id, cost, `CFA: ${factors.length} factors`);
                            await logAnalysisUsage(user.id, 'cfa', cost);
                            setNcsBalance(prev => Math.max(0, prev - cost));
                        }

                        setResults({ type: 'cfa', data: result, columns: neededCols });
                        setStep('results');
                        showToast('Phân tích CFA thành công!', 'success');
                    } catch (err) {
                        handleAnalysisError(err);
                    } finally {
                        setIsAnalyzing(false);
                    }
                }}
                isAnalyzing={isAnalyzing}
                onBack={() => setStep('analyze')}
            />
        );
    }

    // SEM
    if (step === 'sem-select') {
        return (
            <SEMSelection
                columns={columns}
                onRunSEM={async (syntax, factors) => {
                    setIsAnalyzing(true);
                    setAnalysisType('sem');

                    if (user) {
                        const cost = await getAnalysisCost('sem');
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
                        const neededCols: string[] = Array.from(new Set(factors.flatMap((f: any) => f.indicators)));
                        const semData = data.map(row => neededCols.map((c: string) => Number(row[c]) || 0));

                        const result = await runSEM(semData, neededCols, syntax);

                        if (user) {
                            const cost = await getAnalysisCost('sem');
                            await deductCredits(user.id, cost, `SEM: ${factors.length} factors`);
                            await logAnalysisUsage(user.id, 'sem', cost);
                            setNcsBalance(prev => Math.max(0, prev - cost));
                        }

                        setResults({ type: 'sem', data: result, columns: neededCols });
                        setStep('results');
                        showToast('Phân tích SEM thành công!', 'success');
                    } catch (err) {
                        handleAnalysisError(err);
                    } finally {
                        setIsAnalyzing(false);
                    }
                }}
                isAnalyzing={isAnalyzing}
                onBack={() => setStep('analyze')}
            />
        );
    }

    return null;
};
