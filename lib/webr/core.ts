import { WebR } from 'webr';
import { translateRError } from './utils';

let webRInstance: WebR | null = null;
let isInitializing = false;
let initPromise: Promise<WebR> | null = null;
let initProgress: string = '';
let onProgressCallback: ((msg: string) => void) | null = null;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Error recovery state
let lastError: Error | null = null;
let errorRecoveryInProgress = false;

// Get current WebR loading status
export function getWebRStatus(): {
    isReady: boolean;
    isLoading: boolean;
    progress: string;
    lastError: string | null;
    canRetry: boolean;
} {
    return {
        isReady: webRInstance !== null,
        isLoading: isInitializing,
        progress: initProgress,
        lastError: lastError?.message || null,
        canRetry: initAttempts < MAX_INIT_ATTEMPTS && !isInitializing
    };
}

// Set callback for progress updates
export function setProgressCallback(callback: (msg: string) => void) {
    onProgressCallback = callback;
}

/**
 * Internal helper to update progress
 */
function updateProgress(msg: string): void {
    initProgress = msg;
    if (onProgressCallback) {
        onProgressCallback(msg);
    }
}

/**
 * Reset WebR instance and clear error state
 */
export function resetWebR(): void {
    webRInstance = null;
    isInitializing = false;
    initPromise = null;
    initProgress = '';
    lastError = null;
    errorRecoveryInProgress = false;
    initAttempts = 0;
    updateProgress('WebR reset - ready for reinitialization');
}

/**
 * Recover from WebR errors with exponential backoff
 */
async function recoverFromError(error: Error, attempt: number): Promise<void> {
    lastError = error;
    errorRecoveryInProgress = true;

    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, attempt) * 1000;
    updateProgress(`WebR error recovery... waiting ${delay / 1000}s`);

    await new Promise(resolve => setTimeout(resolve, delay));

    // Clear corrupted state
    webRInstance = null;
    initPromise = null;

    errorRecoveryInProgress = false;
}

/**
 * Initialize WebR instance (singleton with promise caching and retry logic)
 */
export async function initWebR(maxRetries: number = 3): Promise<WebR> {
    // Return existing instance
    if (webRInstance) {
        try {
            if (typeof webRInstance.evalR === 'function') {
                return webRInstance;
            }
        } catch (e) {
            console.warn('WebR instance exists but is not usable, reinitializing...');
            webRInstance = null;
        }
    }

    // Return existing promise if init in progress
    if (initPromise) {
        return initPromise;
    }

    if (isInitializing) {
        // Wait for initialization to complete
        let attempts = 0;
        while (isInitializing && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        if (webRInstance) {
            return webRInstance;
        }
        throw new Error('WebR initialization timeout');
    }

    isInitializing = true;
    updateProgress('R-Engine Loading...');

    // Retry logic wrapper
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        initAttempts = attempt + 1;

        initPromise = (async () => {
            try {
                // Mobile-friendly config: Ensure PostMessage channel and service worker
                const webR = new WebR({
                    channelType: 1, // PostMessage channel (safest for cross-origin)
                    serviceWorkerUrl: '/webr-serviceworker.js'
                });

                updateProgress('R-Engine Loading...');

                // Ensure ServiceWorker is registered (critical for mobile/COOP)
                if ('serviceWorker' in navigator) {
                    try {
                        const registration = await navigator.serviceWorker.register('/webr-serviceworker.js');
                        await navigator.serviceWorker.ready;
                        console.log('WebR ServiceWorker ready:', registration.scope);
                    } catch (swError) {
                        console.warn('ServiceWorker registration failed:', swError);
                        // Don't crash, WebR might still work in some modes, but likely will fail later
                    }
                }

                await webR.init();

                // Step 1: Set correct WASM Repo (Priority: 1. Core WASM, 2. R-Universe for missing binaries like quadprog)
                await webR.evalR('options(repos = c(R_WASM = "https://repo.r-wasm.org/", CRAN = "https://cran.r-universe.dev/"))');

                // Verify initialization
                if (!webR.evalR) {
                    throw new Error('WebR initialized but evalR is not available');
                }

                // Step 2: Install required packages
                updateProgress('R-Engine Loading...');
                try {
                    // Stage 1 & 2 packages
                    await webR.installPackages(['psych', 'corrplot', 'GPArotation', 'car', 'cluster']);

                    // Stage 3 packages (Experimental SEM)
                    try {
                        await webR.installPackages(['lavaan', 'quadprog']);
                    } catch (semPkgError) {
                        console.warn('SEM Packages (lavaan) failed to install - structural models will be disabled:', semPkgError);
                    }
                } catch (pkgError) {
                    console.warn('Core Package install warning:', pkgError);
                }

                // Step 3 & 4: Load packages and integrity check
                updateProgress('R-Engine Loading...');

                await webR.evalR('library(psych)');
                await webR.evalR('library(GPArotation)');

                // Attempt to load lavaan if installed
                try {
                    await webR.evalR('library(lavaan)');
                    console.log('SEM Engine (lavaan) successfully loaded');
                } catch (e) {
                    console.warn('SEM Engine (lavaan) not available');
                }

                updateProgress('R-Engine Ready');
                webRInstance = webR;
                isInitializing = false;
                initPromise = null;
                lastError = null; // Clear any previous errors
                return webR;
            } catch (error) {
                console.error(`WebR init attempt ${attempt + 1} failed:`, error);

                // If not last attempt, try error recovery
                if (attempt < maxRetries - 1) {
                    await recoverFromError(error as Error, attempt);
                    updateProgress(`R-Engine Loading... (Retry ${attempt + 2})`);
                    throw error; // Throw to trigger retry
                }

                // Last attempt failed
                isInitializing = false;
                webRInstance = null;
                initPromise = null;
                lastError = error as Error;
                updateProgress('R-Engine Error!');
                console.error('WebR initialization error:', error);
                throw new Error(`Failed to initialize WebR after ${maxRetries} attempts: ${error}`);
            }
        })();

        try {
            return await initPromise;
        } catch (error) {
            if (attempt === maxRetries - 1) {
                throw error;
            }
            // Continue to next retry
        }
    }

    throw new Error('WebR initialization failed');
}

/**
 * Execute R code with error recovery and timeout protection
 */
export async function executeRWithRecovery(rCode: string, maxRetries: number = 2, timeoutMs: number = 60000): Promise<any> {
    const webR = await initWebR();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Wrap evalR in a timeout to prevent infinite hangs
            const result = await Promise.race([
                webR.evalR(rCode),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`R execution timeout after ${timeoutMs / 1000}s`)), timeoutMs)
                )
            ]);
            return result;
        } catch (error: any) {
            console.error(`R execution attempt ${attempt + 1} failed:`, error);

            if (attempt === maxRetries) {
                throw new Error(translateRError(error.message || String(error)));
            }

            // Check if WebR instance is corrupted or timed out
            if (error.message?.includes('WebR instance') ||
                error.message?.includes('not initialized') ||
                error.message?.includes('timeout') ||
                !webRInstance?.evalR) {

                console.warn('WebR instance corrupted or timed out, reinitializing...');
                webRInstance = null;
                await initWebR();
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
}
