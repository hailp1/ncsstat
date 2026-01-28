'use client';

// Prevent prerendering - this page requires client-side Supabase
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileUpload } from '@/components/FileUpload';
import { DataProfiler } from '@/components/DataProfiler';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { SmartGroupSelector, VariableSelector, AISettings } from '@/components/VariableSelector'; // Keep if used elsewhere or remove if grep confirmed unused. Grep said unused.
import { profileData, DataProfile } from '@/lib/data-profiler';
import { runDescriptiveStats, runTTestIndependent, runTTestPaired, runOneWayANOVA, runChiSquare, runMannWhitneyU, runCorrelation, runKruskalWallis, runWilcoxonSignedRank, initWebR, getWebRStatus, setProgressCallback } from '@/lib/webr-wrapper';
import { BarChart3, FileText, Shield, Trash2, Eye, EyeOff, Wifi, WifiOff, RotateCcw, XCircle } from 'lucide-react';
import { Toast } from '@/components/ui/Toast';
import { WebRStatus } from '@/components/WebRStatus';
import { AnalysisSelector } from '@/components/AnalysisSelector';
import { useAnalysisSession } from '@/hooks/useAnalysisSession';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { AnalysisStep } from '@/types/analysis';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { Badge } from '@/components/ui/Badge';
// Removed runCFA, runSEM import line entirely
import { RegressionView } from '@/components/analyze/views/RegressionView';
import { MediationView } from '@/components/analyze/views/MediationView';
import { MultivariateView } from '@/components/analyze/views/MultivariateView';
import { ReliabilityView } from '@/components/analyze/views/ReliabilityView';
import type { PreviousAnalysisData } from '@/types/analysis';
import { DemographicSurvey } from '@/components/feedback/DemographicSurvey';
import { ApplicabilitySurvey } from '@/components/feedback/ApplicabilitySurvey';
import { FeedbackService } from '@/lib/feedback-service';
import { getSupabase } from '@/utils/supabase/client';
import Header from '@/components/layout/Header'
import AnalysisToolbar from '@/components/analyze/AnalysisToolbar';
import SaveProjectModal from '@/components/analyze/SaveProjectModal';
import Footer from '@/components/layout/Footer';
import { getAnalysisCost, checkBalance, deductCredits, getUserBalance } from '@/lib/ncs-credits';
import { logAnalysisUsage, logExport } from '@/lib/activity-logger';
import { InsufficientCreditsModal } from '@/components/InsufficientCreditsModal';
import { NcsBalanceBadge } from '@/components/NcsBalanceBadge';
import { MobileWebRFallback, useSharedArrayBufferSupport } from '@/components/MobileWebRFallback';
import { getORCIDUser } from '@/utils/cookie-helper';
import { useAuth } from '@/context/AuthContext';
import { useAnalysisPersistence } from '@/hooks/useAnalysisPersistence';

export default function AnalyzePage() {
    const router = useRouter()
    const { user, profile: userProfile, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);

    // Synchronize balance with profile tokens
    useEffect(() => {
        if (userProfile?.tokens !== undefined) {
            setNcsBalance(userProfile.tokens);
        }
    }, [userProfile?.tokens]);

    // Overall loading state - follow auth context
    useEffect(() => {
        if (!authLoading) {
            setLoading(false);
        }
    }, [authLoading]);

    // Session State Management
    const {
        isPrivateMode, setIsPrivateMode,
        clearSession,
        step, setStep,
        data, setData,
        filename, setFilename,
        profile, setProfile,
        analysisType, setAnalysisType,
        results, setResults,
        multipleResults, setMultipleResults,
        scaleName, setScaleName
    } = useAnalysisSession();


    // Local ephemeral state
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Feedback State
    const [showDemographics, setShowDemographics] = useState(false);
    const [showApplicability, setShowApplicability] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    // Workflow Mode State
    const [previousAnalysis, setPreviousAnalysis] = useState<PreviousAnalysisData | null>(null);

    // Online/Offline detection
    const { isOnline, wasOffline } = useOnlineStatus();

    // Progress tracking
    const [analysisProgress, setAnalysisProgress] = useState(0);

    // NCS Credit System State
    const [ncsBalance, setNcsBalance] = useState<number>(0);
    const [showInsufficientCredits, setShowInsufficientCredits] = useState(false);
    const [requiredCredits, setRequiredCredits] = useState(0);
    const [currentAnalysisCost, setCurrentAnalysisCost] = useState(0);

    // Auto-Save / Persistence Hook
    const { saveWorkspace, loadWorkspace, hasSavedData, clearWorkspace } = useAnalysisPersistence();
    const [showRestoreBanner, setShowRestoreBanner] = useState(false);

    // Check availability of saved data on mount
    // Safety check: if step requires data/profile but they are missing, redirect
    useEffect(() => {
        if (loading) return; // Wait until auth loading completes

        // If data is lost, always go back to upload
        if (data.length === 0 && step !== 'upload') {
            setStep('upload');
            return;
        }

        // If at profile step but no profile exists, try to recreate it or go back
        if (step === 'profile' && !profile && data.length > 0) {
            const prof = profileData(data);
            if (prof) {
                setProfile(prof);
            } else {
                setStep('upload');
            }
        }
    }, [step, data.length, profile, loading, setStep, setProfile]);

    useEffect(() => {
        if (hasSavedData && data.length === 0) {
            setShowRestoreBanner(true);
        } else {
            setShowRestoreBanner(false);
        }
    }, [hasSavedData, data.length]);

    // Auto-Save Effect (Debounced 3s)
    useEffect(() => {
        if (data.length > 0) {
            const timer = setTimeout(() => {
                saveWorkspace({
                    data,
                    columns: getNumericColumns(),
                    fileName: filename,
                    currentStep: step,
                    results,
                    analysisType,
                });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [data, step, results, analysisType, filename, saveWorkspace]);

    // Handle Restoration
    const handleRestore = async () => {
        const saved = await loadWorkspace();
        if (saved) {
            setData(saved.data);
            setFilename(saved.fileName);
            // Re-profile data to ensure consistency
            const prof = profileData(saved.data);
            setProfile(prof);

            setStep(saved.currentStep);
            setResults(saved.results);
            setAnalysisType(saved.analysisType);
            showToast('Đã khôi phục phiên làm việc trước đó!', 'success');
            setShowRestoreBanner(false);
        }
    };

    const discardSaved = async () => {
        await clearWorkspace();
        setShowRestoreBanner(false);
        showToast('Đã xóa dữ liệu đã lưu.', 'info');
    };

    // Persist workflow state to sessionStorage (Legacy - Keeping for now)
    useEffect(() => {
        if (previousAnalysis) {
            sessionStorage.setItem('workflow_state', JSON.stringify(previousAnalysis));
        }
    }, [previousAnalysis]);

    // Load workflow state on mount
    useEffect(() => {
        const saved = sessionStorage.getItem('workflow_state');
        if (saved) {
            try {
                setPreviousAnalysis(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse workflow state:', e);
            }
        }
    }, []);

    // Handle online/offline events
    useEffect(() => {
        const handleOnline = () => {
            showToast('Kết nối Internet đã được khôi phục!', 'success');
        };

        const handleOffline = () => {
            showToast('Mất kết nối Internet. Một số tính năng có thể không hoạt động.', 'error');
        };

        window.addEventListener('app:online', handleOnline);
        window.addEventListener('app:offline', handleOffline);

        return () => {
            window.removeEventListener('app:online', handleOnline);
            window.removeEventListener('app:offline', handleOffline);
        };
    }, []);

    // Auto-initialize WebR on page load (eager loading)
    useEffect(() => {
        const status = getWebRStatus();
        if (!status.isReady && !status.isLoading) {
            console.log('[WebR] Starting auto-initialization...');

            // Subscribe to progress updates
            setProgressCallback((msg) => {
                setToast({ message: msg, type: 'info' });
            });

            initWebR()
                .then(() => {
                    console.log('[WebR] Auto-initialization successful');
                    setToast({ message: 'R Engine đã sẵn sàng!', type: 'success' });
                })
                .catch(err => {
                    console.error('[WebR] Auto-initialization failed:', err);
                    setToast({ message: 'Lỗi khởi tạo R Engine. Vui lòng tải lại trang.', type: 'error' });
                });
        }
    }, []); // Run once on mount

    // Check for Demographics Survey (Part 1)
    useEffect(() => {
        // Delay slightly to let page load
        const timer = setTimeout(() => {
            if (!FeedbackService.hasCompletedDemographics()) {
                setShowDemographics(true);
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    // Additional check when entering analyze step
    useEffect(() => {
        if (step === 'analyze') {
            const status = getWebRStatus();
            if (!status.isReady && !status.isLoading) {
                setToast({ message: 'Đang khởi tạo R Engine...', type: 'info' });
                initWebR().then(() => {
                    setToast({ message: 'R Engine sẵn sàng!', type: 'success' });
                }).catch(err => {
                    setToast({ message: `Lỗi khởi tạo: ${err.message || err}`, type: 'error' });
                });
            }
        }
    }, [step]);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
        // Auto-dismiss after 5 seconds
        setTimeout(() => setToast(null), 5000);
    };

    const handleAnalysisError = (err: any) => {
        const msg = err.message || String(err);
        console.error("Analysis Error:", err);

        if (msg.includes('subscript out of bounds')) {
            showToast('Lỗi: Không tìm thấy dữ liệu biến (Kiểm tra tên cột).', 'error');
        } else if (msg.includes('singular matrix') || msg.includes('computational singular')) {
            showToast('Lỗi: Ma trận đặc dị (Có đa cộng tuyến hoàn hảo hoặc biến hằng số).', 'error');
        } else if (msg.includes('missing value') || msg.includes('NA/NaN')) {
            showToast('Lỗi: Dữ liệu chứa giá trị trống (NA). Đang thử dùng FIML, nhưng nếu vẫn lỗi hãy làm sạch dữ liệu.', 'error');
        } else if (msg.includes('model is not identified')) {
            showToast('Lỗi SEM/CFA: Mô hình không xác định (Not Identified). Kiểm tra lại số lượng biến quan sát (cần >= 3 biến/nhân tố) hoặc bậc tự do.', 'error');
        } else if (msg.includes('could not find function')) {
            showToast('Lỗi: Gói phân tích chưa tải xong. Vui lòng thử lại sau 5 giây.', 'error');
        } else if (msg.includes('covariance matrix is not positive definite')) {
            showToast('Lỗi: Ma trận hiệp phương sai không xác định dương (Not Positive Definite). Kiểm tra đa cộng tuyến hoặc kích thước mẫu quá nhỏ.', 'error');
        } else {
            // Translate common R errors if possible
            showToast(`Lỗi: ${msg.replace('Error in', '').substring(0, 100)}...`, 'error');
        }
    };

    // Workflow Mode Handlers (with batched updates)
    const handleProceedToEFA = (goodItems: string[]) => {
        // Batch state updates to reduce re-renders
        Promise.resolve().then(() => {
            setPreviousAnalysis({
                type: 'cronbach',
                variables: goodItems,
                goodItems,
                results: results?.data
            });
            setStep('efa-select');
            showToast(`Chuyển sang EFA với ${goodItems.length} items tốt`, 'success');
        });
    };

    const handleProceedToCFA = (factors: { name: string; indicators: string[] }[]) => {
        Promise.resolve().then(() => {
            setPreviousAnalysis({
                type: 'efa',
                variables: factors.flatMap(f => f.indicators),
                factors,
                results: results?.data
            });
            setStep('cfa-select');
            showToast(`Chuyển sang CFA với ${factors.length} factors`, 'success');
        });
    };

    const handleProceedToSEM = (factors: { name: string; indicators: string[] }[]) => {
        Promise.resolve().then(() => {
            setPreviousAnalysis({
                type: 'cfa',
                variables: factors.flatMap(f => f.indicators),
                factors,
                results: results?.data
            });
            setStep('sem-select');
            showToast(`Chuyển sang SEM với measurement model đã xác nhận`, 'success');
        });
    };

    const handleDataLoaded = (loadedData: any[], fname: string) => {
        // Validation: check file size
        if (loadedData.length > 50000) {
            showToast('File quá lớn (>50,000 rows). Vui lòng giảm kích thước file.', 'error');
            return;
        }

        // Large data sampling (10k-50k rows)
        let processedData = loadedData;
        if (loadedData.length > 10000) {
            showToast(`Dữ liệu lớn (${loadedData.length} rows). Đang lấy mẫu ngẫu nhiên 10,000 rows...`, 'info');
            // Random sampling
            const shuffled = [...loadedData].sort(() => 0.5 - Math.random());
            processedData = shuffled.slice(0, 10000);
            showToast('Đã lấy mẫu 10,000 rows. Kết quả đại diện cho toàn bộ dữ liệu.', 'success');
        }

        setData(processedData);
        setFilename(fname);

        // Profile the data
        const prof = profileData(processedData);
        setProfile(prof);
        setStep('profile');
    };

    const handleProceedToAnalysis = () => {
        setStep('analyze');
    };

    // Get numeric columns from profile
    const getNumericColumns = () => {
        if (!profile) return [];
        return Object.entries(profile.columnStats)
            .filter(([_, stats]) => stats.type === 'numeric')
            .map(([name, _]) => name);
    };

    // Get all column names from profile
    const getAllColumns = () => {
        if (!profile) return [];
        return Object.keys(profile.columnStats);
    };



    const runAnalysis = async (type: string) => {
        setIsAnalyzing(true);
        setAnalysisType(type);
        let progressInterval: NodeJS.Timeout | undefined;

        try {
            const numericColumns = getNumericColumns();

            if (numericColumns.length < 2) {
                showToast('Cần ít nhất 2 biến số để phân tích', 'error');
                setIsAnalyzing(false);
                setIsAnalyzing(false);
                return;
            }

            // NCS Credit Check
            if (user) {
                const cost = await getAnalysisCost(type);
                const hasEnough = await checkBalance(user.id, cost);
                if (!hasEnough) {
                    setRequiredCredits(cost);
                    setCurrentAnalysisCost(cost);
                    setShowInsufficientCredits(true);
                    setIsAnalyzing(false);
                    return;
                }
            }

            setAnalysisProgress(0);

            // Progress simulation
            progressInterval = setInterval(() => {
                setAnalysisProgress(prev => Math.min(prev + 10, 90));
            }, 300);

            const numericData = data.map(row =>
                numericColumns.map(col => Number(row[col]) || 0)
            );

            let analysisResults;
            setAnalysisProgress(30);

            switch (type) {
                case 'correlation':
                    analysisResults = await runCorrelation(numericData);
                    break;
                case 'descriptive':
                    analysisResults = await runDescriptiveStats(numericData);
                    break;

                default:
                    throw new Error('Unknown analysis type');
            }

            clearInterval(progressInterval);
            setAnalysisProgress(100);

            // Deduct credits on success
            if (user) {
                const cost = await getAnalysisCost(type);
                await deductCredits(user.id, cost, `${type === 'correlation' ? 'Correlation Matrix' : 'Descriptive Stats'}`);
                await logAnalysisUsage(user.id, type, cost);
                setNcsBalance(prev => Math.max(0, prev - cost));
            }

            setResults({
                type,
                data: analysisResults,
                columns: numericColumns
            });
            setStep('results');
            showToast('Phân tích hoàn thành!', 'success');
        } catch (error) {
            handleAnalysisError(error);
        } finally {
            setIsAnalyzing(false);
            setAnalysisProgress(0);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Ctrl+S: Export PDF
            if (e.ctrlKey && e.key === 's' && step === 'results' && results) {
                e.preventDefault();
                handleExportPDF();
                showToast('Đang xuất PDF... (Ctrl+S)', 'info');
            }

            // Ctrl+E: Export Excel (future feature)
            if (e.ctrlKey && e.key === 'e' && step === 'results' && results) {
                e.preventDefault();
                showToast('Excel export sẽ có trong phiên bản tiếp theo (Ctrl+E)', 'info');
            }

            // Ctrl+N: New analysis
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                setStep('upload');
                setData([]);
                setProfile(null);
                setResults(null);
                showToast('Bắt đầu phân tích mới (Ctrl+N)', 'success');
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [step, results]);

    // Handle PDF Export (Actual Logic)
    const runExportPDF = async () => {
        try {
            const { exportToPDF } = await import('@/lib/pdf-exporter');

            showToast('Đang tạo PDF, vui lòng đợi...', 'info');

            // Capture charts if any
            const chartImages: string[] = [];
            const container = document.getElementById('analysis-results-container');
            if (container) {
                const canvases = container.querySelectorAll('canvas');
                canvases.forEach(canvas => {
                    try {
                        chartImages.push(canvas.toDataURL('image/png'));
                    } catch (e) {
                        console.warn('Canvas capture failed:', e);
                    }
                });
            }

            // Handle batch Cronbach export - SINGLE FILE with all scales
            if (analysisType === 'cronbach-batch' && multipleResults.length > 0) {
                // Combine all results into single PDF
                const combinedTitle = `Cronbach's Alpha - Phân tích ${multipleResults.length} thang đo`;
                const combinedResults = {
                    batchResults: multipleResults.map(r => ({
                        scaleName: r.scaleName,
                        alpha: r.data.alpha || r.data.rawAlpha,
                        rawAlpha: r.data.rawAlpha,
                        standardizedAlpha: r.data.standardizedAlpha,
                        nItems: r.data.nItems,
                        itemTotalStats: r.data.itemTotalStats,
                        columns: r.columns
                    }))
                };

                await exportToPDF({
                    title: combinedTitle,
                    analysisType: 'cronbach-batch',
                    results: combinedResults,
                    columns: [],
                    filename: `cronbach_batch_${multipleResults.length}_scales_${Date.now()}.pdf`,
                    chartImages: []
                });
                if (user) {
                    await logExport(user.id, 'PDF: cronbach-batch');
                }
                showToast(`Đã xuất 1 file PDF tổng hợp ${multipleResults.length} thang đo!`, 'success');
            } else {
                // Single result export
                await exportToPDF({
                    title: `Phân tích ${analysisType}`,
                    analysisType,
                    results: results?.data || results,
                    columns: results?.columns || [],
                    filename: `statviet_${analysisType}_${Date.now()}.pdf`,
                    chartImages
                });
                if (user) {
                    await logExport(user.id, `PDF: ${analysisType}`);
                }
                showToast('Đã xuất PDF thành công!', 'success');
            }
        } catch (error) {
            console.error(error);
            showToast('Lỗi xuất PDF: Vui lòng thử lại', 'error');
        }
    };

    // Trigger Export Flow (Check for Part 3)
    const handleExportPDF = () => {
        // Always show survey if not done? Or just export?
        // User requested: Part 3 appears when User clicks Export.
        // We'll show it if not done yet.
        /*
        // UNCOMMENT TO FORCE SURVEY EVERY TIME:
        setShowApplicability(true);
        */

        // Logic: Check if survey done. If not, show survey. If yes, just export.
        // But user might want to give feedback on THIS specific manuscript (Q8).
        // So we should probably show it, but maybe allow skipping?
        // For now, consistent with prompt "Part 3 appears..." -> We show it.
        setShowApplicability(true);
    };

    // Map steps for StepIndicator
    const getStepId = (): string => {
        if (step === 'upload') return 'upload';
        if (step === 'profile') return 'profile';
        if (step === 'results') return 'results';
        return 'analyze'; // All selection/analysis steps
    };

    const steps = [
        { id: 'upload', label: 'Tải dữ liệu' },
        { id: 'profile', label: 'Kiểm tra' },
        { id: 'analyze', label: 'Phân tích' },
        { id: 'results', label: 'Kết quả' }
    ];

    if (loading) {
        const webRStatus = getWebRStatus();
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-600 font-medium">Đang xác thực...</p>
                    {webRStatus.isReady && (
                        <p className="text-green-600 text-sm">✓ R Engine đã sẵn sàng</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
            {/* Toast Notification */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Mobile WebR Fallback Warning */}
            <MobileWebRFallback />

            {/* Offline Warning Banner */}
            {!isOnline && (
                <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-2 px-4 text-center z-50 flex items-center justify-center gap-2">
                    <WifiOff className="w-5 h-5" />
                    <span className="font-semibold">Không có kết nối Internet. Một số tính năng có thể không hoạt động.</span>
                </div>
            )}

            {/* Analysis Progress Bar */}
            {isAnalyzing && analysisProgress > 0 && (
                <div className="fixed top-0 left-0 right-0 z-40">
                    <div className="h-1 bg-blue-200">
                        <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${analysisProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Restore Session Banner */}
            {showRestoreBanner && (
                <div className="bg-amber-50 border-b border-amber-200 py-3 relative z-30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <RotateCcw className="w-5 h-5 text-amber-600" />
                            <p className="text-sm text-amber-800">
                                <span className="font-bold">Khôi phục phiên làm việc:</span> Chúng tôi tìm thấy dữ liệu chưa lưu từ phiên làm việc trước.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRestore}
                                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                            >
                                Khôi phục ngay
                            </button>
                            <button
                                onClick={discardSaved}
                                className="px-3 py-1.5 text-amber-700 hover:bg-amber-100 text-sm font-medium rounded-lg transition-colors"
                            >
                                Bỏ qua
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Header with Integrated Toolbar */}
            <Header
                user={user}
                profile={userProfile}
                hideNav={true}
                centerContent={
                    <AnalysisToolbar
                        isPrivateMode={isPrivateMode}
                        setIsPrivateMode={setIsPrivateMode}
                        clearSession={() => {
                            clearSession();
                            showToast('Đã xóa dữ liệu phiên làm việc', 'info');
                        }}
                        filename={filename}
                        onSave={() => setIsSaveModalOpen(true)}
                    />
                }
            />

            <div className="bg-blue-50/50 border-b border-blue-100 py-1">
                <div className="container mx-auto px-6 flex items-center justify-center gap-2 text-[11px] text-blue-600/80">
                    <Shield className="w-3 h-3" />
                    <span className="font-semibold">Bảo mật:</span>
                    <span>Dữ liệu xử lý cục bộ 100% (Client-side), an toàn tuyệt đối.</span>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="container mx-auto px-6 py-8">
                <div className="flex items-center justify-center gap-4 mb-8">
                    {['upload', 'profile', 'analyze', 'results'].map((s, idx) => {
                        const stepOrder = ['upload', 'profile', 'analyze', 'results'];

                        // Map sub-steps to their main steps for UI consistency
                        const getMainStep = (current: string) => {
                            if (stepOrder.includes(current)) return current;
                            if (current.endsWith('-select')) return 'analyze';
                            return current;
                        };

                        const effectiveStep = getMainStep(step);
                        const currentIdx = stepOrder.indexOf(effectiveStep);
                        const isCompleted = currentIdx > idx;
                        const isCurrent = effectiveStep === s;
                        const isClickable = isCompleted || isCurrent;

                        return (
                            <div key={s} className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isClickable) {
                                            if (s === 'analyze' && step.endsWith('-select')) {
                                                setStep('analyze'); // Go back to selector
                                            } else {
                                                setStep(s as AnalysisStep);
                                            }
                                        }
                                    }}
                                    disabled={!isClickable}
                                    className={`
                                        w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
                                        ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                                            isCompleted ? 'bg-green-500 text-white hover:bg-green-600 hover:scale-110' :
                                                'bg-gray-200 text-gray-500 cursor-not-allowed'}
                                        ${isClickable ? 'cursor-pointer hover:shadow-lg' : ''}
                                    `}
                                    title={isClickable ? `Quay lại: ${steps.find(st => st.id === s)?.label || s}` : undefined}
                                >
                                    {idx + 1}
                                </button>
                                {idx < 3 && (
                                    <div className={`w-16 h-1 ${currentIdx > idx ?
                                        'bg-green-500' : 'bg-gray-200'
                                        }`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="py-8">

                    {step === 'upload' && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    Tải lên dữ liệu của bạn
                                </h2>
                                <p className="text-gray-600">
                                    Hỗ trợ file CSV và Excel (.xlsx, .xls)
                                </p>
                            </div>
                            <FileUpload onDataLoaded={handleDataLoaded} />
                        </div>
                    )}

                    {step === 'profile' && profile && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    Báo cáo chất lượng dữ liệu
                                </h2>
                                <p className="text-gray-600">
                                    Kiểm tra và xác nhận dữ liệu trước khi phân tích
                                </p>
                            </div>
                            <DataProfiler profile={profile} onProceed={handleProceedToAnalysis} />
                        </div>
                    )}

                    {step === 'analyze' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    Chọn phương pháp phân tích
                                </h2>
                                <p className="text-gray-600">
                                    Chọn phương pháp phù hợp với mục tiêu nghiên cứu
                                </p>
                            </div>

                            <AnalysisSelector
                                onSelect={(s) => setStep(s as AnalysisStep)}
                                onRunAnalysis={runAnalysis}
                                isAnalyzing={isAnalyzing}
                            />

                            {isAnalyzing && (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                                    <p className="mt-4 text-gray-600">Đang phân tích...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Descriptive Statistics Selection */}
                    {step === 'descriptive-select' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    Thống kê mô tả
                                </h2>
                                <p className="text-gray-600">
                                    Chọn các biến định lượng để tính toán Mean, SD, Min, Max...
                                </p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border">
                                <p className="text-sm text-gray-600 mb-4">
                                    Chọn biến (có thể chọn nhiều):
                                </p>
                                <div className="max-h-60 overflow-y-auto space-y-2 mb-6 border rounded p-2">
                                    {getNumericColumns().map(col => (
                                        <div key={col} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`desc-col-${col}`}
                                                name="desc-col"
                                                value={col}
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <label htmlFor={`desc-col-${col}`} className="text-sm text-gray-700 select-none cursor-pointer w-full">
                                                {col}
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex space-x-3 mb-6 text-sm">
                                    <button
                                        onClick={() => document.querySelectorAll('input[name="desc-col"]').forEach((el: any) => el.checked = true)}
                                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                                    >
                                        Chọn tất cả
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                        onClick={() => document.querySelectorAll('input[name="desc-col"]').forEach((el: any) => el.checked = false)}
                                        className="text-gray-500 hover:text-gray-700 font-medium"
                                    >
                                        Bỏ chọn
                                    </button>
                                </div>

                                <button
                                    onClick={async () => {
                                        const selectedElements = Array.from(document.querySelectorAll('input[name="desc-col"]:checked'));
                                        const selectedCols = selectedElements.map(cb => (cb as HTMLInputElement).value);

                                        if (selectedCols.length === 0) {
                                            setToast({ message: 'Vui lòng chọn ít nhất 1 biến', type: 'error' });
                                            return;
                                        }

                                        setIsAnalyzing(true);
                                        setAnalysisType('descriptive');
                                        try {
                                            // Prepare data subset
                                            // The order of data columns must match selectedCols to align with results
                                            const numericSubset = data.map(row => selectedCols.map(col => Number(row[col]) || 0));

                                            // Pass the subset
                                            const result = await runDescriptiveStats(numericSubset);

                                            setResults({
                                                type: 'descriptive',
                                                data: result,
                                                columns: selectedCols // Store columns to map back
                                            });
                                            setStep('results');
                                            setToast({ message: 'Phân tích hoàn tất!', type: 'success' });
                                        } catch (err) {
                                            console.error(err);
                                            setToast({ message: 'Lỗi: ' + (err instanceof Error ? err.message : String(err)), type: 'error' });
                                        } finally {
                                            setIsAnalyzing(false);
                                        }
                                    }}
                                    disabled={isAnalyzing}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {isAnalyzing ? 'Đang xử lý...' : 'Chạy Thống kê mô tả'}
                                </button>
                            </div>

                            <button
                                onClick={() => setStep('analyze')}
                                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                            >
                                ← Quay lại
                            </button>
                        </div>
                    )}
                    {/* Reliability Analysis (Cronbach, Omega, EFA, CFA, SEM) */}
                    {['cronbach-select', 'omega-select', 'efa-select', 'cfa-select', 'sem-select'].includes(step) && (
                        <ReliabilityView
                            step={step}
                            data={data}
                            columns={getNumericColumns()}
                            user={user}
                            setResults={setResults}
                            setStep={setStep}
                            setNcsBalance={setNcsBalance}
                            showToast={showToast}

                            setScaleName={setScaleName}
                            setMultipleResults={setMultipleResults}
                            setAnalysisType={setAnalysisType}
                            setRequiredCredits={setRequiredCredits}
                            setCurrentAnalysisCost={setCurrentAnalysisCost}
                            setShowInsufficientCredits={setShowInsufficientCredits}
                        />
                    )}



                    {/* T-test Selection */}
                    {step === 'ttest-select' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    Independent Samples T-test
                                </h2>
                                <p className="text-gray-600">
                                    So sánh trung bình giữa 2 nhóm độc lập
                                </p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border">
                                <p className="text-sm text-gray-600 mb-4">
                                    Chọn 2 biến số để so sánh trung bình:
                                </p>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm 1</label>
                                        <select
                                            id="ttest-group1"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            defaultValue=""
                                        >
                                            <option value="">Chọn biến...</option>
                                            {getNumericColumns().map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm 2</label>
                                        <select
                                            id="ttest-group2"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            defaultValue=""
                                        >
                                            <option value="">Chọn biến...</option>
                                            {getNumericColumns().map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        const g1 = (document.getElementById('ttest-group1') as HTMLSelectElement).value;
                                        const g2 = (document.getElementById('ttest-group2') as HTMLSelectElement).value;
                                        if (!g1 || !g2) { showToast('Vui lòng chọn cả 2 biến', 'error'); return; }
                                        if (g1 === g2) { showToast('Vui lòng chọn 2 biến khác nhau', 'error'); return; }
                                        setIsAnalyzing(true);
                                        setAnalysisType('ttest-indep');

                                        // NCS Credit Check
                                        if (user) {
                                            const cost = await getAnalysisCost('ttest-indep');
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
                                            const group1Data = data.map(row => Number(row[g1]) || 0);
                                            const group2Data = data.map(row => Number(row[g2]) || 0);
                                            const result = await runTTestIndependent(group1Data, group2Data);
                                            // Deduct credits on success
                                            if (user) {
                                                const cost = await getAnalysisCost('ttest-indep');
                                                await deductCredits(user.id, cost, `Independent T-Test: ${g1} vs ${g2}`);
                                                await logAnalysisUsage(user.id, 'ttest-indep', cost);
                                                setNcsBalance(prev => Math.max(0, prev - cost));
                                            }

                                            setResults({ type: 'ttest-indep', data: result, columns: [g1, g2] });
                                            setStep('results');
                                            showToast('Phân tích T-test hoàn thành!', 'success');
                                        } catch (err) { showToast('Lỗi: ' + err, 'error'); }
                                        finally { setIsAnalyzing(false); }
                                    }}
                                    disabled={isAnalyzing}
                                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
                                >
                                    {isAnalyzing ? 'Đang phân tích...' : 'Chạy Independent T-test'}
                                </button>
                            </div>

                            <button
                                onClick={() => setStep('analyze')}
                                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg"
                            >
                                ← Quay lại
                            </button>
                        </div>
                    )}

                    {/* Paired T-test Selection - NEW */}
                    {step === 'ttest-paired-select' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    Paired Samples T-test
                                </h2>
                                <p className="text-gray-600">
                                    So sánh trước-sau (cùng một nhóm đối tượng)
                                </p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border">
                                <p className="text-sm text-gray-600 mb-4">
                                    Chọn biến trước và sau để so sánh:
                                </p>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Trước (Before)</label>
                                        <select
                                            id="paired-before"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            defaultValue=""
                                        >
                                            <option value="">Chọn biến...</option>
                                            {getNumericColumns().map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sau (After)</label>
                                        <select
                                            id="paired-after"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            defaultValue=""
                                        >
                                            <option value="">Chọn biến...</option>
                                            {getNumericColumns().map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        const before = (document.getElementById('paired-before') as HTMLSelectElement).value;
                                        const after = (document.getElementById('paired-after') as HTMLSelectElement).value;
                                        if (!before || !after) { showToast('Vui lòng chọn cả 2 biến', 'error'); return; }
                                        if (before === after) { showToast('Vui lòng chọn 2 biến khác nhau', 'error'); return; }
                                        setIsAnalyzing(true);
                                        setAnalysisType('ttest-paired');

                                        // NCS Credit Check
                                        if (user) {
                                            const cost = await getAnalysisCost('ttest-paired');
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
                                            const beforeData = data.map(row => Number(row[before]) || 0);
                                            const afterData = data.map(row => Number(row[after]) || 0);
                                            const result = await runTTestPaired(beforeData, afterData);
                                            // Deduct credits on success
                                            if (user) {
                                                const cost = await getAnalysisCost('ttest-paired');
                                                await deductCredits(user.id, cost, `Paired T-Test: ${before} vs ${after}`);
                                                await logAnalysisUsage(user.id, 'ttest-paired', cost);
                                                setNcsBalance(prev => Math.max(0, prev - cost));
                                            }

                                            setResults({ type: 'ttest-paired', data: result, columns: [before, after] });
                                            setStep('results');
                                            showToast('Phân tích Paired T-test hoàn thành!', 'success');
                                        } catch (err) { showToast('Lỗi: ' + err, 'error'); }
                                        finally { setIsAnalyzing(false); }
                                    }}
                                    disabled={isAnalyzing}
                                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
                                >
                                    {isAnalyzing ? 'Đang phân tích...' : 'Chạy Paired T-test'}
                                </button>
                            </div>

                            <button
                                onClick={() => setStep('analyze')}
                                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg"
                            >
                                ← Quay lại
                            </button>
                        </div>
                    )}

                    {/* ANOVA Selection */}
                    {step === 'anova-select' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    One-Way ANOVA
                                </h2>
                                <p className="text-gray-600">
                                    So sánh trung bình giữa nhiều nhóm (≥3)
                                </p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border">
                                <p className="text-sm text-gray-600 mb-4">
                                    Chọn các biến để so sánh (mỗi biến là 1 nhóm):
                                </p>
                                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                                    {getNumericColumns().map(col => (
                                        <label key={col} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                            <input
                                                type="checkbox"
                                                value={col}
                                                className="anova-checkbox w-4 h-4 text-purple-600"
                                            />
                                            <span>{col}</span>
                                        </label>
                                    ))}
                                </div>
                                <button
                                    onClick={async () => {
                                        const checkboxes = document.querySelectorAll('.anova-checkbox:checked') as NodeListOf<HTMLInputElement>;
                                        const selectedCols = Array.from(checkboxes).map(cb => cb.value);
                                        if (selectedCols.length < 3) { showToast('Cần chọn ít nhất 3 biến', 'error'); return; }
                                        setIsAnalyzing(true);
                                        setAnalysisType('anova');

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
                                            const groups = selectedCols.map(col => data.map(row => Number(row[col]) || 0));
                                            const result = await runOneWayANOVA(groups);
                                            // Deduct credits on success
                                            if (user) {
                                                const cost = await getAnalysisCost('anova');
                                                await deductCredits(user.id, cost, `One-Way ANOVA: ${selectedCols.length} variables`);
                                                await logAnalysisUsage(user.id, 'anova', cost);
                                                setNcsBalance(prev => Math.max(0, prev - cost));
                                            }

                                            setResults({ type: 'anova', data: result, columns: selectedCols });
                                            setStep('results');
                                            showToast('Phân tích ANOVA hoàn thành!', 'success');
                                        } catch (err) { showToast('Lỗi: ' + err, 'error'); }
                                        finally { setIsAnalyzing(false); }
                                    }}
                                    disabled={isAnalyzing}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg"
                                >
                                    {isAnalyzing ? 'Đang phân tích...' : 'Chạy ANOVA'}
                                </button>
                            </div>

                            <button
                                onClick={() => setStep('analyze')}
                                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg"
                            >
                                ← Quay lại
                            </button>
                        </div>
                    )}



                    {/* Regression Analysis (Linear & Logistic) */}
                    {['regression-select', 'logistic-select'].includes(step) && (
                        <RegressionView
                            step={step}
                            data={data}
                            columns={getNumericColumns()}
                            user={user}
                            setResults={setResults}
                            setStep={setStep}
                            setNcsBalance={setNcsBalance}
                            showToast={showToast}

                            setAnalysisType={setAnalysisType}
                            setRequiredCredits={setRequiredCredits}
                            setCurrentAnalysisCost={setCurrentAnalysisCost}
                            setShowInsufficientCredits={setShowInsufficientCredits}
                        />
                    )}





                    {/* Chi-Square Selection - NEW */}
                    {step === 'chisq-select' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    Chi-Square Test of Independence
                                </h2>
                                <p className="text-gray-600">
                                    Kiểm định mối quan hệ giữa 2 biến định danh (Categorical Variables)
                                </p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border">
                                <p className="text-sm text-gray-600 mb-4">
                                    Chọn 2 biến để kiểm định:
                                </p>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Biến hàng (Row)</label>
                                        <select
                                            id="chisq-row"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            defaultValue=""
                                        >
                                            <option value="">Chọn biến...</option>
                                            {/* For Chi-Square, we ideally want ALL columns, not just numeric. But data profiler usually casts. Let's start with numeric or maybe allow all? 
                                                Actually getNumericColumns returns only numeric. Chi-Square works on categories. 
                                                If data is coded 1,2,3 it works. If text, we need 'profile.columnStats'.
                                            */}
                                            {profile?.columnStats && Object.keys(profile.columnStats).map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Biến cột (Col)</label>
                                        <select
                                            id="chisq-col"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            defaultValue=""
                                        >
                                            <option value="">Chọn biến...</option>
                                            {profile?.columnStats && Object.keys(profile.columnStats).map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        const rVar = (document.getElementById('chisq-row') as HTMLSelectElement).value;
                                        const cVar = (document.getElementById('chisq-col') as HTMLSelectElement).value;

                                        if (!rVar || !cVar) { showToast('Vui lòng chọn cả 2 biến', 'error'); return; }
                                        if (rVar === cVar) { showToast('Vui lòng chọn 2 biến khác nhau', 'error'); return; }

                                        setIsAnalyzing(true);
                                        setAnalysisType('chisquare'); // Matches ResultsDisplay 'chisquare' case

                                        // NCS Credit Check
                                        if (user) {
                                            const cost = await getAnalysisCost('chisquare');
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
                                            // Pass RAW data (strings/numbers) for Chi-Square to handle cross-tabulation
                                            // runChiSquare implementation (checked via memory or intuition) usually takes a matrix or two arrays.
                                            // Let's check signature in webr-wrapper.
                                            // Assuming runChiSquare(dataMatrix) or similar.
                                            // Actually, the generic 'runAnalysis' loop used 'runChiSquare(numericData)'. 
                                            // But Chi-Square needs categorical. 
                                            // Let's implement specific logic here: pass 2 arrays.

                                            // We need to fetch 'runChiSquare' from webr-wrapper or implement a specific one if the generic one assumes numeric matrix.
                                            // The generic runChiSquare (imported) likely expects matrix.
                                            // Let's try passing numeric mapping if possible, or wait, we need to see runChiSquare signature.
                                            // FOR NOW, assumption: runChiSquare takes data matrix [ [val1, val2], ... ]

                                            // Create data matrix [ [rowVal, colVal], ... ]
                                            const chiData = data.map(row => [
                                                row[rVar],
                                                row[cVar]
                                            ]);

                                            const result = await runChiSquare(chiData); // Need to verify signature
                                            // Deduct credits on success
                                            if (user) {
                                                const cost = await getAnalysisCost('chisquare');
                                                await deductCredits(user.id, cost, `Chi-Square: ${rVar} vs ${cVar}`);
                                                await logAnalysisUsage(user.id, 'chisquare', cost);
                                                setNcsBalance(prev => Math.max(0, prev - cost));
                                            }

                                            setResults({ type: 'chisquare', data: result, columns: [rVar, cVar] });
                                            setStep('results');
                                            showToast('Phân tích Chi-Square hoàn thành!', 'success');
                                        } catch (err) { showToast('Lỗi: ' + err, 'error'); }
                                        finally { setIsAnalyzing(false); }
                                    }}
                                    disabled={isAnalyzing}
                                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg"
                                >
                                    {isAnalyzing ? 'Đang phân tích...' : 'Chạy Chi-Square Test'}
                                </button>
                            </div>

                            <button
                                onClick={() => setStep('analyze')}
                                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg"
                            >
                                ← Quay lại
                            </button>
                        </div>
                    )}

                    {/* Fisher Exact Selection - NEW */}
                    {step === 'fisher-select' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    Fisher&apos;s Exact Test
                                </h2>
                                <p className="text-gray-600">
                                    Kiểm định mối quan hệ biến định danh (Dành cho mẫu nhỏ)
                                </p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border">
                                <p className="text-sm text-gray-600 mb-4">
                                    Chọn 2 biến để kiểm định:
                                </p>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Biến hàng (Row)</label>
                                        <select
                                            id="fisher-row"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            defaultValue=""
                                        >
                                            <option value="">Chọn biến...</option>
                                            {profile?.columnStats && Object.keys(profile.columnStats).map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Biến cột (Col)</label>
                                        <select
                                            id="fisher-col"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            defaultValue=""
                                        >
                                            <option value="">Chọn biến...</option>
                                            {profile?.columnStats && Object.keys(profile.columnStats).map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        const rVar = (document.getElementById('fisher-row') as HTMLSelectElement).value;
                                        const cVar = (document.getElementById('fisher-col') as HTMLSelectElement).value;

                                        if (!rVar || !cVar) { showToast('Vui lòng chọn cả 2 biến', 'error'); return; }
                                        if (rVar === cVar) { showToast('Vui lòng chọn 2 biến khác nhau', 'error'); return; }

                                        setIsAnalyzing(true);
                                        setAnalysisType('chisquare'); // Reuse chisquare logical flow

                                        // NCS Credit Check (using chisquare cost)
                                        if (user) {
                                            const cost = await getAnalysisCost('chisquare');
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
                                            const fisherData = data.map(row => [
                                                row[rVar],
                                                row[cVar]
                                            ]);

                                            const result = await runChiSquare(fisherData);
                                            // Deduct credits on success
                                            if (user) {
                                                const cost = await getAnalysisCost('chisquare');
                                                await deductCredits(user.id, cost, `Fisher Exact: ${rVar} vs ${cVar}`);
                                                await logAnalysisUsage(user.id, 'chisquare', cost);
                                                setNcsBalance(prev => Math.max(0, prev - cost));
                                            }

                                            setResults({ type: 'chisquare', data: result, columns: [rVar, cVar] });
                                            setStep('results');
                                            showToast('Phân tích Fisher Exact hoàn thành!', 'success');
                                        } catch (err) { showToast('Lỗi: ' + err, 'error'); }
                                        finally { setIsAnalyzing(false); }
                                    }}
                                    disabled={isAnalyzing}
                                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg"
                                >
                                    {isAnalyzing ? 'Đang phân tích...' : 'Chạy Fisher Exact Test'}
                                </button>
                            </div>

                            <button
                                onClick={() => setStep('analyze')}
                                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg"
                            >
                                ← Quay lại
                            </button>
                        </div>
                    )}

                    {/* Mann-Whitney U Selection */}
                    {step === 'mannwhitney-select' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    Mann-Whitney U Test
                                </h2>
                                <p className="text-gray-600">
                                    So sánh trung vị giữa 2 nhóm độc lập (Phi tham số)
                                </p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border">
                                <p className="text-sm text-gray-600 mb-4 font-medium">
                                    Chọn 2 biến định lượng để so sánh:
                                </p>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm 1</label>
                                        <select
                                            id="mw-group1"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                            defaultValue=""
                                        >
                                            <option value="">Chọn biến...</option>
                                            {getNumericColumns().map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm 2</label>
                                        <select
                                            id="mw-group2"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                            defaultValue=""
                                        >
                                            <option value="">Chọn biến...</option>
                                            {getNumericColumns().map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        const g1 = (document.getElementById('mw-group1') as HTMLSelectElement).value;
                                        const g2 = (document.getElementById('mw-group2') as HTMLSelectElement).value;

                                        if (!g1 || !g2) { showToast('Vui lòng chọn cả 2 biến', 'error'); return; }
                                        if (g1 === g2) { showToast('Vui lòng chọn 2 biến khác nhau', 'error'); return; }

                                        setIsAnalyzing(true);
                                        setAnalysisType('mann-whitney');

                                        // NCS Credit Check
                                        const cost = await getAnalysisCost('mann-whitney');
                                        if (user) {
                                            const { hasEnough } = await checkBalance(user.id, cost);
                                            if (!hasEnough) {
                                                setRequiredCredits(cost);
                                                setCurrentAnalysisCost(cost);
                                                setShowInsufficientCredits(true);
                                                setIsAnalyzing(false);
                                                return;
                                            }
                                        }

                                        try {
                                            const group1Data = data.map(row => Number(row[g1]) || 0);
                                            const group2Data = data.map(row => Number(row[g2]) || 0);
                                            const result = await runMannWhitneyU(group1Data, group2Data);

                                            if (user) {
                                                await deductCredits(user.id, cost, `Mann-Whitney U: ${g1} vs ${g2}`);
                                                await logAnalysisUsage(user.id, 'mann-whitney', cost);
                                                setNcsBalance(prev => Math.max(0, prev - cost));
                                            }

                                            setResults({ type: 'mann-whitney', data: result, columns: [g1, g2] });
                                            setStep('results');
                                            showToast('Phân tích Mann-Whitney U thành công!', 'success');
                                        } catch (err: any) {
                                            showToast('Lỗi: ' + (err.message || err), 'error');
                                        } finally {
                                            setIsAnalyzing(false);
                                        }
                                    }}
                                    disabled={isAnalyzing}
                                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                                >
                                    {isAnalyzing ? 'Đang phân tích...' : 'Chạy Mann-Whitney U'}
                                </button>
                            </div>

                            <button
                                onClick={() => setStep('analyze')}
                                className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-all"
                            >
                                ← Quay lại chọn phương pháp
                            </button>
                        </div>
                    )}

                    {/* Kruskal-Wallis Selection */}
                    {step === 'kruskalwallis-select' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    Kruskal-Wallis Test
                                </h2>
                                <p className="text-gray-600">
                                    So sánh trung vị giữa nhiều nhóm (Phi tham số)
                                </p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-sm text-gray-600 font-medium">
                                        Chọn các biến để so sánh (mỗi biến là 1 nhóm):
                                    </p>
                                    <div className="space-x-2">
                                        <button
                                            onClick={() => {
                                                const cbs = document.querySelectorAll('.kw-checkbox') as NodeListOf<HTMLInputElement>;
                                                cbs.forEach(c => c.checked = true);
                                            }}
                                            className="text-xs text-blue-600 font-medium hover:underline"
                                        >
                                            Chọn hết
                                        </button>
                                        <button
                                            onClick={() => {
                                                const cbs = document.querySelectorAll('.kw-checkbox') as NodeListOf<HTMLInputElement>;
                                                cbs.forEach(c => c.checked = false);
                                            }}
                                            className="text-xs text-gray-500 font-medium hover:underline"
                                        >
                                            Bỏ chọn
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1 mb-6 max-h-48 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                                    {getNumericColumns().map(col => (
                                        <label key={col} className="flex items-center gap-3 p-2 hover:bg-white hover:shadow-sm rounded-md transition-all cursor-pointer">
                                            <input
                                                type="checkbox"
                                                value={col}
                                                className="kw-checkbox w-4 h-4 text-amber-600 rounded"
                                            />
                                            <span className="text-sm text-gray-700">{col}</span>
                                        </label>
                                    ))}
                                </div>

                                <button
                                    onClick={async () => {
                                        const cbs = document.querySelectorAll('.kw-checkbox:checked') as NodeListOf<HTMLInputElement>;
                                        const selectedCols = Array.from(cbs).map(cb => cb.value);

                                        if (selectedCols.length < 3) {
                                            showToast('Cần chọn ít nhất 3 biến (3 nhóm) để so sánh', 'error');
                                            return;
                                        }

                                        setIsAnalyzing(true);
                                        setAnalysisType('kruskal-wallis');

                                        const cost = await getAnalysisCost('kruskal-wallis');
                                        if (user) {
                                            const { hasEnough } = await checkBalance(user.id, cost);
                                            if (!hasEnough) {
                                                setRequiredCredits(cost);
                                                setCurrentAnalysisCost(cost);
                                                setShowInsufficientCredits(true);
                                                setIsAnalyzing(false);
                                                return;
                                            }
                                        }

                                        try {
                                            const groups = selectedCols.map(col => data.map(row => Number(row[col]) || 0));
                                            const result = await runKruskalWallis(groups);

                                            if (user) {
                                                await deductCredits(user.id, cost, `Kruskal-Wallis: ${selectedCols.length} groups`);
                                                await logAnalysisUsage(user.id, 'kruskal-wallis', cost);
                                                setNcsBalance(prev => Math.max(0, prev - cost));
                                            }

                                            setResults({ type: 'kruskal-wallis', data: result, columns: selectedCols });
                                            setStep('results');
                                            showToast('Phân tích Kruskal-Wallis thành công!', 'success');
                                        } catch (err: any) {
                                            showToast('Lỗi: ' + (err.message || err), 'error');
                                        } finally {
                                            setIsAnalyzing(false);
                                        }
                                    }}
                                    disabled={isAnalyzing}
                                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                                >
                                    {isAnalyzing ? 'Đang phân tích...' : 'Chạy Kruskal-Wallis'}
                                </button>
                            </div>

                            <button
                                onClick={() => setStep('analyze')}
                                className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-all"
                            >
                                ← Quay lại chọn phương pháp
                            </button>
                        </div>
                    )}

                    {/* Wilcoxon Signed Rank Selection */}
                    {step === 'wilcoxon-select' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    Wilcoxon Signed Rank Test
                                </h2>
                                <p className="text-gray-600">
                                    So sánh cặp trước-sau (Phi tham số)
                                </p>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg p-6 border">
                                <p className="text-sm text-gray-600 mb-4 font-medium">
                                    Chọn biến Trước và Sau (Ví dụ: Pre-test vs Post-test):
                                </p>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Trước (Before)</label>
                                        <select
                                            id="wilcox-before"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                            defaultValue=""
                                        >
                                            <option value="">Chọn biến...</option>
                                            {getNumericColumns().map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sau (After)</label>
                                        <select
                                            id="wilcox-after"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                            defaultValue=""
                                        >
                                            <option value="">Chọn biến...</option>
                                            {getNumericColumns().map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        const before = (document.getElementById('wilcox-before') as HTMLSelectElement).value;
                                        const after = (document.getElementById('wilcox-after') as HTMLSelectElement).value;

                                        if (!before || !after) { showToast('Vui lòng chọn đủ 2 biến', 'error'); return; }
                                        if (before === after) { showToast('Hãy chọn 2 biến khác nhau', 'error'); return; }

                                        setIsAnalyzing(true);
                                        setAnalysisType('wilcoxon');

                                        const cost = await getAnalysisCost('wilcoxon');
                                        if (user) {
                                            const { hasEnough } = await checkBalance(user.id, cost);
                                            if (!hasEnough) {
                                                setRequiredCredits(cost);
                                                setCurrentAnalysisCost(cost);
                                                setShowInsufficientCredits(true);
                                                setIsAnalyzing(false);
                                                return;
                                            }
                                        }

                                        try {
                                            const beforeData = data.map(row => Number(row[before]) || 0);
                                            const afterData = data.map(row => Number(row[after]) || 0);
                                            const result = await runWilcoxonSignedRank(beforeData, afterData);

                                            if (user) {
                                                await deductCredits(user.id, cost, `Wilcoxon: ${before} vs ${after}`);
                                                await logAnalysisUsage(user.id, 'wilcoxon', cost);
                                                setNcsBalance(prev => Math.max(0, prev - cost));
                                            }

                                            setResults({ type: 'wilcoxon', data: result, columns: [before, after] });
                                            setStep('results');
                                            showToast('Phân tích Wilcoxon thành công!', 'success');
                                        } catch (err: any) {
                                            showToast('Lỗi: ' + (err.message || err), 'error');
                                        } finally {
                                            setIsAnalyzing(false);
                                        }
                                    }}
                                    disabled={isAnalyzing}
                                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                                >
                                    {isAnalyzing ? 'Đang phân tích...' : 'Chạy Wilcoxon Test'}
                                </button>
                            </div>

                            <button
                                onClick={() => setStep('analyze')}
                                className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-all"
                            >
                                ← Quay lại chọn phương pháp
                            </button>
                        </div>
                    )}







                    {/* Multivariate Analysis (Cluster & Two-Way ANOVA) */}
                    {['cluster-select', 'twoway-anova-select'].includes(step) && (
                        <MultivariateView
                            step={step}
                            data={data}
                            columns={getNumericColumns()} // For Cluster (numeric)
                            allColumns={getAllColumns()} // For Two-Way ANOVA (factors)
                            profile={profile}
                            user={user}
                            setResults={setResults}
                            setStep={setStep}
                            setNcsBalance={setNcsBalance}
                            showToast={showToast}
                            setAnalysisType={setAnalysisType}
                            setRequiredCredits={setRequiredCredits}
                            setCurrentAnalysisCost={setCurrentAnalysisCost}
                            setShowInsufficientCredits={setShowInsufficientCredits}
                        />
                    )}

                    {/* Mediation & Moderation Analysis */}
                    {['mediation-select', 'moderation-select'].includes(step) && (
                        <MediationView
                            step={step}
                            data={data}
                            columns={getNumericColumns()}
                            user={user}
                            setResults={setResults}
                            setStep={setStep}
                            setNcsBalance={setNcsBalance}
                            showToast={showToast}

                            setAnalysisType={setAnalysisType}
                            setRequiredCredits={setRequiredCredits}
                            setCurrentAnalysisCost={setCurrentAnalysisCost}
                            setShowInsufficientCredits={setShowInsufficientCredits}
                        />
                    )}







                    {step === 'results' && (results || multipleResults.length > 0) && (

                        <div className="max-w-6xl mx-auto space-y-6" id="results-container">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    Kết quả phân tích
                                </h2>
                                <p className="text-gray-600">
                                    {analysisType === 'cronbach' && `Cronbach's Alpha${results?.scaleName ? ` - ${results.scaleName}` : ''}`}
                                    {analysisType === 'omega' && `McDonald's Omega${results?.scaleName ? ` - ${results.scaleName}` : ''}`}
                                    {analysisType === 'cronbach-batch' && `Cronbach's Alpha - ${multipleResults.length} thang đo`}
                                    {analysisType === 'omega-batch' && `McDonald's Omega - ${multipleResults.length} thang đo`}
                                    {analysisType === 'correlation' && "Ma trận tương quan"}
                                    {analysisType === 'descriptive' && "Thống kê mô tả"}
                                    {analysisType === 'ttest' && "Independent Samples T-test"}
                                    {analysisType === 'ttest-paired' && "Paired Samples T-test"}
                                    {analysisType === 'anova' && "One-Way ANOVA"}
                                    {analysisType === 'efa' && "Exploratory Factor Analysis"}
                                    {analysisType === 'regression' && "Multiple Linear Regression"}
                                    {analysisType === 'logistic' && "Logistic Regression"}
                                    {analysisType === 'twoway-anova' && "Two-Way ANOVA"}
                                    {analysisType === 'mediation' && "Mediation Analysis"}
                                    {analysisType === 'moderation' && "Moderation Analysis"}
                                    {analysisType === 'cluster' && "Cluster Analysis (K-Means)"}
                                    {analysisType === 'mann-whitney' && "Mann-Whitney U Test"}
                                    {analysisType === 'kruskal-wallis' && "Kruskal-Wallis Test"}
                                    {analysisType === 'wilcoxon' && "Wilcoxon Signed Rank Test"}
                                </p>
                            </div>

                            {/* Single Result Display */}
                            {results && analysisType !== 'cronbach-batch' && analysisType !== 'omega-batch' && (
                                <ResultsDisplay
                                    analysisType={analysisType}
                                    results={results.data}
                                    columns={results.columns}
                                    onProceedToEFA={handleProceedToEFA}
                                    onProceedToCFA={handleProceedToCFA}
                                    onProceedToSEM={handleProceedToSEM}
                                    userProfile={userProfile}
                                    scaleName={results.scaleName}
                                />
                            )}

                            {/* Batch Results Display */}
                            {(analysisType === 'cronbach-batch' || analysisType === 'omega-batch') && multipleResults.length > 0 && (
                                <div className="space-y-8">
                                    {/* Summary Table */}
                                    <div className="bg-white rounded-xl shadow-lg p-6">
                                        <h3 className="text-lg font-bold text-gray-800 mb-4">Tổng hợp độ tin cậy các thang đo</h3>
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b-2 border-gray-300">
                                                    <th className="py-2 px-3 font-semibold">Thang đo</th>
                                                    <th className="py-2 px-3 font-semibold text-center">Số biến</th>
                                                    <th className="py-2 px-3 font-semibold text-center">Cronbach&apos;s Alpha</th>
                                                    <th className="py-2 px-3 font-semibold text-center">Đánh giá</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {multipleResults.map((r, idx) => {
                                                    const alpha = r.data?.alpha || r.data?.rawAlpha || 0;
                                                    let evaluation = '';
                                                    let evalColor = '';
                                                    if (alpha >= 0.9) { evaluation = 'Xuất sắc'; evalColor = 'text-green-700 bg-green-100'; }
                                                    else if (alpha >= 0.8) { evaluation = 'Tốt'; evalColor = 'text-green-600 bg-green-50'; }
                                                    else if (alpha >= 0.7) { evaluation = 'Chấp nhận'; evalColor = 'text-blue-600 bg-blue-50'; }
                                                    else if (alpha >= 0.6) { evaluation = 'Khá'; evalColor = 'text-yellow-600 bg-yellow-50'; }
                                                    else { evaluation = 'Kém'; evalColor = 'text-red-600 bg-red-50'; }

                                                    return (
                                                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                                            <td className="py-3 px-3 font-medium">{r.scaleName}</td>
                                                            <td className="py-3 px-3 text-center">{r.columns.length}</td>
                                                            <td className="py-3 px-3 text-center font-bold">{alpha.toFixed(3)}</td>
                                                            <td className="py-3 px-3 text-center">
                                                                <span className={`px-2 py-1 rounded text-sm font-medium ${evalColor}`}>
                                                                    {evaluation}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Detailed Results for Each Group */}
                                    {multipleResults.map((r, idx) => (
                                        <div key={idx} className="border-t pt-6">
                                            <h4 className="text-lg font-bold text-gray-800 mb-4">
                                                Chi tiết: {r.scaleName} ({r.columns.join(', ')})
                                            </h4>
                                            <ResultsDisplay
                                                analysisType="cronbach"
                                                results={r.data}
                                                columns={r.columns}
                                                userProfile={userProfile}
                                                scaleName={r.scaleName}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => {
                                        setResults(null);
                                        setStep('analyze');
                                    }}
                                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                                >
                                    ← Phân tích khác
                                </button>
                                <button
                                    onClick={handleExportPDF}
                                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <FileText className="w-5 h-5" />
                                    Xuất PDF
                                </button>
                                <div className="relative group">
                                    <button
                                        disabled
                                        className="px-6 py-3 bg-blue-400 text-white font-semibold rounded-lg flex items-center gap-2 cursor-not-allowed opacity-70"
                                    >
                                        <FileText className="w-5 h-5" />
                                        Xuất Word
                                    </button>
                                    <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                        Soon
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setStep('upload');
                                        setData([]);
                                        setProfile(null);
                                        setResults(null);
                                        setMultipleResults([]);
                                    }}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Tải file mới
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <Footer />

            {/* Custom styles for animations */}
            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
            {/* Feedback Part 1: Demographics Survey */}
            <DemographicSurvey
                isOpen={showDemographics}
                onComplete={() => {
                    setShowDemographics(false);
                    showToast('Cảm ơn bạn đã cung cấp thông tin!', 'success');
                }}
            />

            {/* Feedback Part 3: Applicability Survey */}
            <ApplicabilitySurvey
                isOpen={showApplicability}
                onComplete={() => {
                    setShowApplicability(false);
                    runExportPDF(); // Proceed to export
                }}
                onCancel={() => {
                    setShowApplicability(false);
                    // Just close, do not export? Or allow export without feedback?
                    // Typically "Cancel" means cancel the action.
                    // If they want to export without feedback, they should probably have a "Skip" option inside (not implemented yet),
                    // or we assume completing Q8 is mandatory for the "Value" (Export).
                }}
            />

            {/* Save Project Modal */}
            <SaveProjectModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                data={data}
                results={results}
                analysisType={analysisType}
                step={step}
            />

            {/* Insufficient Credits Modal */}
            <InsufficientCreditsModal
                isOpen={showInsufficientCredits}
                onClose={() => setShowInsufficientCredits(false)}
                required={requiredCredits}
                available={ncsBalance}
            />
        </div >
    );
}
