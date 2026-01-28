/**
 * Rate Limiting Utility
 * Simple in-memory rate limiter for API endpoints
 */

interface RateLimitConfig {
    interval: number; // Time window in milliseconds
    uniqueTokenPerInterval: number; // Max unique tokens per interval
}

interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

class RateLimiter {
    private requests = new Map<string, number[]>();
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig) {
        this.config = config;
    }

    async check(limit: number, token: string): Promise<RateLimitResult> {
        const now = Date.now();
        const windowStart = now - this.config.interval;

        // Get existing requests for this token
        const tokenRequests = this.requests.get(token) || [];
        
        // Remove old requests outside the window
        const validRequests = tokenRequests.filter(time => time > windowStart);
        
        // Check if limit exceeded
        const success = validRequests.length < limit;
        
        if (success) {
            // Add current request
            validRequests.push(now);
            this.requests.set(token, validRequests);
        }

        // Cleanup old entries periodically
        if (Math.random() < 0.01) { // 1% chance
            this.cleanup();
        }

        return {
            success,
            limit,
            remaining: Math.max(0, limit - validRequests.length - (success ? 0 : 1)),
            reset: windowStart + this.config.interval
        };
    }

    private cleanup(): void {
        const now = Date.now();
        const windowStart = now - this.config.interval;

        for (const [token, requests] of this.requests.entries()) {
            const validRequests = requests.filter(time => time > windowStart);
            
            if (validRequests.length === 0) {
                this.requests.delete(token);
            } else {
                this.requests.set(token, validRequests);
            }
        }
    }

    // Get current stats
    getStats(): { totalTokens: number; totalRequests: number } {
        let totalRequests = 0;
        
        for (const requests of this.requests.values()) {
            totalRequests += requests.length;
        }

        return {
            totalTokens: this.requests.size,
            totalRequests
        };
    }
}

/**
 * Create a rate limiter instance
 */
export function rateLimit(config: RateLimitConfig): RateLimiter {
    return new RateLimiter(config);
}

/**
 * Default rate limiter for API routes
 */
export const defaultRateLimit = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500 // 500 unique IPs per minute
});

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictRateLimit = rateLimit({
    interval: 60 * 1000, // 1 minute  
    uniqueTokenPerInterval: 100 // 100 unique IPs per minute
});

/**
 * Helper function to get client IP from request
 */
export function getClientIP(request: Request): string {
    // Try various headers for IP detection
    const headers = request.headers;
    
    return (
        headers.get('x-forwarded-for')?.split(',')[0] ||
        headers.get('x-real-ip') ||
        headers.get('cf-connecting-ip') ||
        headers.get('x-client-ip') ||
        '127.0.0.1'
    );
}

/**
 * Rate limit middleware for API routes
 */
export async function checkRateLimit(
    request: Request,
    limit: number = 10,
    limiter: RateLimiter = defaultRateLimit
): Promise<RateLimitResult> {
    const ip = getClientIP(request);
    return await limiter.check(limit, ip);
}