/**
 * Error handling utilities for cookie-based authentication
 */

export function normalizeError(error) {
    if (!error) return null;
    
    if (typeof error === 'string') {
        return {
            message: error,
            isTimeout: false,
            operation: 'cookie_auth',
            name: 'CookieError',
            code: null,
            original: error
        };
    }
    
    return {
        message: error.message || 'An unknown error occurred',
        isTimeout: error.isTimeout || error.name === 'TimeoutError',
        operation: error.operation || error.customData?.operation || 'cookie_auth',
        name: error.name || 'CookieError',
        code: error.code || null,
        original: error
    };
}

export function isTimeoutError(error) {
    const normalized = normalizeError(error);
    return normalized?.isTimeout || false;
}

export function getErrorMessage(error) {
    const normalized = normalizeError(error);
    return normalized?.message || 'An unknown error occurred';
}

export function getErrorOperation(error) {
    const normalized = normalizeError(error);
    return normalized?.operation || 'cookie_auth';
}

export function getErrorCode(error) {
    const normalized = normalizeError(error);
    return normalized?.code || null;
}

export function isErrorType(error, type) {
    const normalized = normalizeError(error);
    return normalized?.name === type || normalized?.code === type;
}

export function formatErrorForDisplay(error) {
    if (!error) return null;
    
    const normalized = normalizeError(error);
    
    if (!normalized) {
        return {
            title: 'Authentication Error',
            message: 'An unknown error occurred',
            isTimeout: false,
            severity: 'error',
            operation: 'cookie_auth',
            code: null
        };
    }
    
    // Special handling for cookie errors
    if (normalized.operation === 'cookie_auth') {
        if (normalized.message.includes('expired')) {
            return {
                title: 'Login Attempt Expired',
                message: 'Please start the login process again.',
                isTimeout: false,
                severity: 'warning',
                operation: normalized.operation,
                code: normalized.code
            };
        }
        
        if (normalized.message.includes('corrupted') || normalized.message.includes('invalid')) {
            return {
                title: 'Authentication Error',
                message: 'Invalid authentication data. Please try again.',
                isTimeout: false,
                severity: 'error',
                operation: normalized.operation,
                code: normalized.code
            };
        }
        
        if (normalized.message.includes('Missing') || normalized.message.includes('No auth intent')) {
            return {
                title: 'Authentication Required',
                message: 'Please initiate login from the main application.',
                isTimeout: false,
                severity: 'info',
                operation: normalized.operation,
                code: normalized.code
            };
        }
    }
    
    if (normalized.isTimeout) {
        return {
            title: 'Timeout Error',
            message: normalized.message,
            isTimeout: true,
            severity: 'warning',
            operation: normalized.operation,
            code: normalized.code
        };
    }
    
    if (normalized.code) {
        switch (normalized.code) {
            case 'auth/invalid-action-code':
                return {
                    title: 'Sign-in Link Expired',
                    message: 'The sign-in link has expired. Please request a new one.',
                    isTimeout: false,
                    severity: 'warning',
                    operation: normalized.operation,
                    code: normalized.code
                };
            case 'auth/user-disabled':
                return {
                    title: 'Account Disabled',
                    message: 'This account has been disabled. Contact support for assistance.',
                    isTimeout: false,
                    severity: 'error',
                    operation: normalized.operation,
                    code: normalized.code
                };
            case 'auth/network-request-failed':
                return {
                    title: 'Network Error',
                    message: 'Please check your internet connection and try again.',
                    isTimeout: false,
                    severity: 'warning',
                    operation: normalized.operation,
                    code: normalized.code
                };
        }
    }
    
    if (normalized.message && (normalized.message.includes('network') || 
        normalized.message.includes('offline') ||
        normalized.message.includes('connection'))) {
        return {
            title: 'Network Error',
            message: 'Please check your internet connection and try again.',
            isTimeout: false,
            severity: 'warning',
            operation: normalized.operation,
            code: normalized.code
        };
    }
    
    return {
        title: 'Authentication Error',
        message: normalized.message || 'An unknown error occurred',
        isTimeout: false,
        severity: 'error',
        operation: normalized.operation,
        code: normalized.code
    };
}

/**
 * Format Firebase errors for display
 */
export function formatFirebaseErrorForDisplay(errorString) {
    if (!errorString) return '';
    
    console.log('🔍 Formatting error string:', errorString);
    
    // Direct mapping for the specific error we're seeing
    if (errorString.includes('auth/invalid-action-code') || 
        errorString.includes('(auth/invalid-action-code)')) {
        return 'Sign in link expired or invalid';
    }
    
    // For other Firebase errors
    const firebaseMatch = errorString.match(/\(auth\/([^)]+)\)/);
    if (firebaseMatch) {
        const errorCode = `auth/${firebaseMatch[1]}`;
        const friendlyMessages = {
            'auth/invalid-action-code': 'Sign in link expired or invalid',
            'auth/invalid-email': 'Invalid email address',
            'auth/user-disabled': 'Account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/expired-action-code': 'Sign in link has expired',
            'auth/weak-password': 'Password is too weak',
            'auth/email-already-in-use': 'Email is already in use',
            'auth/operation-not-allowed': 'Operation not allowed',
            'auth/too-many-requests': 'Too many attempts. Please try again later',
            'auth/network-request-failed': 'Network error. Please check your connection',
            'auth/requires-recent-login': 'Please sign in again to complete this action',
            'auth/captcha-check-failed': 'Captcha verification failed',
            'auth/invalid-phone-number': 'Invalid phone number',
            'auth/missing-phone-number': 'Phone number is required',
            'auth/quota-exceeded': 'Quota exceeded. Please try again later',
            'auth/unauthorized-domain': 'Unauthorized domain',
            'auth/invalid-continue-uri': 'Invalid redirect URL',
            'auth/unauthorized-continue-uri': 'Unauthorized redirect URL'
        };
        return friendlyMessages[errorCode] || errorString;
    }
    
    return errorString;
}