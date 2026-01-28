/**
 * Analysis Result Caching System
 * Caches analysis results to avoid re-computation
 */

interface CacheEntry {
    key: string;
    result: any;
    timestamp: number;
    dataHash: string;
    analysisType: string;
}

class AnalysisCache {
    private cache = new Map<string, CacheEntry>();
    private readonly TTL = 30 * 60 * 1000; // 30 minutes
    private readonly MAX_ENTRIES = 50; // Limit memory usage

    /**
     * Generate cache key from data and analysis parameters
     */
    private generateKey(data: any[], analysisType: string, params?: any): string {
        const dataStr = JSON.stringify(data.slice(0, 10)); // Sample first 10 rows for key
        const paramsStr = params ? JSON.stringify(params) : '';
        return `${analysisType}_${this.hashString(dataStr + paramsStr)}`;
    }

    /**
     * Simple hash function for strings
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Generate hash of full dataset for validation
     */
    private generateDataHash(data: any[]): string {
        return this.hashString(JSON.stringify(data));
    }

    /**
     * Clean expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.TTL) {
                expiredKeys.push(key);
            }
        }

        expiredKeys.forEach(key => this.cache.delete(key));

        // If still too many entries, remove oldest
        if (this.cache.size > this.MAX_ENTRIES) {
            const entries = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toRemove = entries.slice(0, this.cache.size - this.MAX_ENTRIES);
            toRemove.forEach(([key]) => this.cache.delete(key));
        }
    }

    /**
     * Get cached result if available and valid
     */
    get(data: any[], analysisType: string, params?: any): any | null {
        this.cleanup();

        const key = this.generateKey(data, analysisType, params);
        const entry = this.cache.get(key);

        if (!entry) return null;

        // Check if data has changed
        const currentDataHash = this.generateDataHash(data);
        if (entry.dataHash !== currentDataHash) {
            this.cache.delete(key);
            return null;
        }

        // Check TTL
        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }

        console.log(`[Cache] Hit for ${analysisType}`);
        return entry.result;
    }

    /**
     * Store result in cache
     */
    set(data: any[], analysisType: string, result: any, params?: any): void {
        this.cleanup();

        const key = this.generateKey(data, analysisType, params);
        const dataHash = this.generateDataHash(data);

        const entry: CacheEntry = {
            key,
            result: JSON.parse(JSON.stringify(result)), // Deep clone
            timestamp: Date.now(),
            dataHash,
            analysisType
        };

        this.cache.set(key, entry);
        console.log(`[Cache] Stored result for ${analysisType}`);
    }

    /**
     * Clear all cached results
     */
    clear(): void {
        this.cache.clear();
        console.log('[Cache] Cleared all entries');
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; types: string[]; oldestEntry: number | null } {
        const types = Array.from(new Set(
            Array.from(this.cache.values()).map(entry => entry.analysisType)
        ));

        const timestamps = Array.from(this.cache.values()).map(entry => entry.timestamp);
        const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : null;

        return {
            size: this.cache.size,
            types,
            oldestEntry
        };
    }

    /**
     * Remove entries for specific analysis type
     */
    clearType(analysisType: string): void {
        const keysToDelete: string[] = [];
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.analysisType === analysisType) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`[Cache] Cleared ${keysToDelete.length} entries for ${analysisType}`);
    }
}

// Singleton instance
export const analysisCache = new AnalysisCache();

/**
 * Wrapper function to cache analysis results
 */
export async function withCache<T>(
    data: any[],
    analysisType: string,
    analysisFunction: () => Promise<T>,
    params?: any
): Promise<T> {
    // Try to get from cache first
    const cached = analysisCache.get(data, analysisType, params);
    if (cached) {
        return cached as T;
    }

    // Run analysis and cache result
    const result = await analysisFunction();
    analysisCache.set(data, analysisType, result, params);
    
    return result;
}

/**
 * Clear cache when data changes
 */
export function clearCacheOnDataChange(): void {
    analysisCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats() {
    return analysisCache.getStats();
}