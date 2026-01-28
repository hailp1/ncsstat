/**
 * Secure Cookie Helper Utilities
 * Replaces manual cookie parsing with validated functions
 */

/**
 * Get cookie value by name with validation
 * @param name Cookie name
 * @returns Cookie value or null if not found/invalid
 */
export function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        
        if (parts.length === 2) {
            const cookieValue = parts.pop()?.split(';').shift();
            return cookieValue ? decodeURIComponent(cookieValue) : null;
        }
        
        return null;
    } catch (error) {
        console.warn(`Failed to get cookie ${name}:`, error);
        return null;
    }
}

/**
 * Set cookie with secure defaults
 * @param name Cookie name
 * @param value Cookie value
 * @param options Cookie options
 */
export function setCookie(
    name: string, 
    value: string, 
    options: {
        expires?: Date;
        maxAge?: number;
        path?: string;
        domain?: string;
        secure?: boolean;
        sameSite?: 'strict' | 'lax' | 'none';
        httpOnly?: boolean;
    } = {}
): void {
    if (typeof document === 'undefined') return;
    
    const {
        expires,
        maxAge,
        path = '/',
        domain,
        secure = true,
        sameSite = 'lax',
        httpOnly = false
    } = options;
    
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    if (expires) cookieString += `; expires=${expires.toUTCString()}`;
    if (maxAge) cookieString += `; max-age=${maxAge}`;
    if (path) cookieString += `; path=${path}`;
    if (domain) cookieString += `; domain=${domain}`;
    if (secure) cookieString += `; secure`;
    if (sameSite) cookieString += `; samesite=${sameSite}`;
    if (httpOnly) cookieString += `; httponly`;
    
    document.cookie = cookieString;
}

/**
 * Delete cookie by name
 * @param name Cookie name
 * @param path Cookie path (default: '/')
 */
export function deleteCookie(name: string, path: string = '/'): void {
    setCookie(name, '', { 
        expires: new Date(0), 
        path,
        secure: true,
        sameSite: 'lax'
    });
}

/**
 * Get ORCID user ID from cookie with validation
 * @returns ORCID user ID or null if invalid
 */
export function getORCIDUser(): string | null {
    const orcidUserId = getCookie('orcid_user');
    
    if (!orcidUserId) return null;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(orcidUserId)) {
        console.warn('Invalid ORCID user ID format in cookie');
        deleteCookie('orcid_user');
        return null;
    }
    
    return orcidUserId;
}

/**
 * Set ORCID user cookie securely
 * @param userId ORCID user ID (UUID)
 * @param maxAge Cookie max age in seconds (default: 30 days)
 */
export function setORCIDUser(userId: string, maxAge: number = 30 * 24 * 60 * 60): void {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(userId)) {
        throw new Error('Invalid ORCID user ID format');
    }
    
    setCookie('orcid_user', userId, {
        maxAge,
        secure: true,
        sameSite: 'lax',
        path: '/'
    });
}

/**
 * Clear ORCID user cookie
 */
export function clearORCIDUser(): void {
    deleteCookie('orcid_user');
}