import { useState, useEffect, useCallback } from 'react';
import { set, get, del } from 'idb-keyval';
import { AnalysisStep } from '@/types/analysis';

const DB_KEY = 'ncsstat_workspace_v1';

export interface WorkspaceState {
    data: any[];
    columns: string[];
    fileName: string;
    currentStep: AnalysisStep;
    results: any;
    analysisType: string;
    timestamp: number;
}

export function useAnalysisPersistence() {
    const [isRestoring, setIsRestoring] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasSavedData, setHasSavedData] = useState(false);

    // Check if there is saved data on mount
    useEffect(() => {
        checkSavedData();
    }, []);

    const checkSavedData = async () => {
        try {
            const data = await get<WorkspaceState>(DB_KEY);
            if (data && data.timestamp) {
                // Only consider it valid if it's less than 7 days old
                const now = Date.now();
                if (now - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
                    setHasSavedData(true);
                } else {
                    await del(DB_KEY); // Expired
                }
            }
        } catch (err) {
            console.error('Failed to check saved workspace:', err);
        } finally {
            setIsRestoring(false);
        }
    };

    const saveWorkspace = useCallback(async (state: Omit<WorkspaceState, 'timestamp'>) => {
        try {
            const dataToSave: WorkspaceState = {
                ...state,
                timestamp: Date.now()
            };
            await set(DB_KEY, dataToSave);
            setLastSaved(new Date());
            setHasSavedData(true);
            console.log('[AutoSave] Workspace saved to IndexedDB');
        } catch (err) {
            console.error('[AutoSave] Failed to save workspace:', err);
        }
    }, []);

    const loadWorkspace = useCallback(async (): Promise<WorkspaceState | null> => {
        try {
            const data = await get<WorkspaceState>(DB_KEY);
            return data || null;
        } catch (err) {
            console.error('[AutoSave] Failed to load workspace:', err);
            return null;
        }
    }, []);

    const clearWorkspace = useCallback(async () => {
        try {
            await del(DB_KEY);
            setHasSavedData(false);
            setLastSaved(null);
            console.log('[AutoSave] Workspace cleared');
        } catch (err) {
            console.error('[AutoSave] Failed to clear workspace:', err);
        }
    }, []);

    return {
        isRestoring,
        hasSavedData,
        lastSaved,
        saveWorkspace,
        loadWorkspace,
        clearWorkspace
    };
}
