/**
 * Comprehensive error formatting utilities
 */

/**
 * Format any error for display
 */
export function formatAnyErrorForDisplay(error) {
    if (!error) return 'An unknown error occurred';
    
    console.log('🔍 Formatting error:', error);
    
    // Handle Firebase error objects (they have a code property starting with 'auth/')
    if (error.code && typeof error.code === 'string' && error.code.startsWith('auth/')) {
        return formatFirebaseError(error.code);
    }
    
    // Handle error objects with message property
    const errorMessage = error.message || error.toString();
    
    // Handle prefixed errors (like "USER_NOT_FOUND:Message")
    if (errorMessage.includes(':')) {
        const parts = errorMessage.split(':');
        if (parts.length > 1) {
            return parts[1].trim();
        }
    }
    
    // Handle form validation errors from Naive UI
    if (error.errors) {
        if (Array.isArray(error.errors)) {
            return error.errors.map(err => err.message).join(', ');
        } else if (error.errors.message) {
            return error.errors.message;
        }
    }
    
    // Firebase errors in string format (e.g., "Firebase: Error (auth/invalid-credential)")
    const firebaseMatch = errorMessage.match(/\(auth\/([^)]+)\)/);
    if (firebaseMatch) {
        return formatFirebaseError(errorMessage);
    }
    
    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('offline') || 
        errorMessage.includes('connection') || errorMessage.includes('Network')) {
        return 'Network error. Please check your internet connection.';
    }
    
    // Cookie/auth errors
    if (errorMessage.includes('cookie') || errorMessage.includes('auth') || 
        errorMessage.includes('Cookie') || errorMessage.includes('Auth')) {
        if (errorMessage.includes('expired')) {
            return 'Login attempt expired. Please try again.';
        }
        if (errorMessage.includes('invalid') || errorMessage.includes('corrupted')) {
            return 'Invalid authentication data. Please try again.';
        }
        if (errorMessage.includes('Missing') || errorMessage.includes('No auth')) {
            return 'Authentication required. Please initiate login from the main application.';
        }
    }
    
    // Default - if it's an object, try to get a meaningful string
    if (typeof error === 'object' && !error.message) {
        // Try to get any string property
        for (const key in error) {
            if (typeof error[key] === 'string') {
                return error[key];
            }
        }
        return 'An unexpected error occurred';
    }
    
    return errorMessage;
}

/**
 * Format Firebase-specific errors
 */
function formatFirebaseError(errorCodeOrString) {
    let errorCode = errorCodeOrString;
    
    // Extract error code from string format like "Error: (auth/invalid-credential)"
    if (typeof errorCodeOrString === 'string') {
        const firebaseMatch = errorCodeOrString.match(/\(auth\/([^)]+)\)/);
        if (firebaseMatch) {
            errorCode = `auth/${firebaseMatch[1]}`;
        }
    }
    
    const friendlyMessages = {
        // Authentication errors
        'auth/invalid-action-code': 'Sign in link expired or invalid',
        'auth/expired-action-code': 'Sign in link has expired',
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'Account has been disabled. Contact administration.',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential': 'Invalid email or password',
        
        // Registration errors
        'auth/email-already-in-use': 'This email is already registered',
        'auth/weak-password': 'Password is too weak. Use at least 8 characters with uppercase, lowercase, numbers, and special characters',
        'auth/invalid-phone-number': 'Invalid phone number',
        'auth/missing-phone-number': 'Phone number is required',
        
        // Operation errors
        'auth/operation-not-allowed': 'Operation not allowed',
        'auth/too-many-requests': 'Too many attempts. Please try again later',
        'auth/requires-recent-login': 'Please sign in again to complete this action',
        'auth/captcha-check-failed': 'Captcha verification failed',
        'auth/quota-exceeded': 'Service temporarily unavailable. Please try again later',
        
        // Network/connection errors
        'auth/network-request-failed': 'Network error. Please check your internet connection',
        
        // Domain/URL errors
        'auth/unauthorized-domain': 'Unauthorized domain',
        'auth/invalid-continue-uri': 'Invalid redirect URL',
        'auth/unauthorized-continue-uri': 'Unauthorized redirect URL',
        'auth/missing-continue-uri': 'Missing redirect URL',
        
        // App/configuration errors
        'auth/app-not-authorised': 'App not authorised',
        'auth/app-not-authorized': 'App not authorised',
        'auth/retry-auth': 'Please try signing in again',
        'auth/invalid-user-token': 'Invalid user token',
        'auth/user-token-expired': 'User token expired',
        'auth/null-user': 'No user signed in',
        'auth/invalid-message-payload': 'Invalid message payload',
        'auth/auth-domain-config-required': 'Authentication configuration required',
        
        // Popup/redirect errors
        'auth/popup-closed-by-user': 'Login popup was closed',
        'auth/popup-blocked': 'Login popup was blocked by browser',
        'auth/account-exists-with-different-credential': 'An account already exists with this email using a different login method',
        'auth/cancelled-popup-request': 'Login request was cancelled',
        
        // Additional common errors
        'auth/argument-error': 'Invalid authentication data provided',
        'auth/app-deleted': 'The app has been deleted',
        'auth/invalid-api-key': 'Invalid API key',
        'auth/missing-android-pkg-name': 'Android package name is required',
        'auth/missing-ios-bundle-id': 'iOS bundle ID is required',
        'auth/unauthorized-continue-uri': 'Unauthorized redirect URL',
        'auth/invalid-custom-token': 'Invalid custom token',
        'auth/custom-token-mismatch': 'Custom token mismatch',
        'auth/credential-already-in-use': 'This credential is already associated with a different user account',
        'auth/email-change-needs-verification': 'Email change requires verification',
        'auth/provider-already-linked': 'Provider is already linked to this account',
        'auth/no-such-provider': 'No such authentication provider'
    };
    
    return friendlyMessages[errorCode] || errorCodeOrString;
}

/**
 * Check if error is a specific type
 */
export function isErrorType(error, type) {
    if (!error) return false;
    
    console.log('🔍 Checking error type:', error, 'against:', type);
    
    // Check Firebase error objects
    if (error.code && error.code === type) {
        return true;
    }
    
    const errorMessage = error.message || error.toString();
    
    // Check for prefixed errors
    if (errorMessage.includes(':')) {
        const errorType = errorMessage.split(':')[0].trim();
        return errorType === type;
    }
    
    // Check Firebase error codes in string format
    const firebaseMatch = errorMessage.match(/\(auth\/([^)]+)\)/);
    if (firebaseMatch) {
        return `auth/${firebaseMatch[1]}` === type;
    }
    
    // Check if error message contains the type
    if (errorMessage.includes(type)) {
        return true;
    }
    
    return false;
}

/**
 * Get error type from error
 */
export function getErrorType(error) {
    if (!error) return 'UNKNOWN';
    
    // Check Firebase error objects
    if (error.code && typeof error.code === 'string') {
        return error.code;
    }
    
    const errorMessage = error.message || error.toString();
    
    // Extract from prefixed errors
    if (errorMessage.includes(':')) {
        return errorMessage.split(':')[0].trim();
    }
    
    // Extract Firebase error code
    const firebaseMatch = errorMessage.match(/\(auth\/([^)]+)\)/);
    if (firebaseMatch) {
        return `auth/${firebaseMatch[1]}`;
    }
    
    return 'UNKNOWN';
}

/**
 * Check if error is a form validation error (from Naive UI)
 */
export function isFormValidationError(error) {
    if (!error) return false;
    
    // Naive UI form validation errors are arrays
    if (Array.isArray(error) && error.length > 0) {
        return true;
    }
    
    // Or they might have an errors property
    if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        return true;
    }
    
    return false;
}

/**
 * Extract form validation error messages
 */
export function extractFormValidationErrors(error) {
    if (!error) return [];
    
    const errors = [];
    
    // Handle Naive UI error array structure
    if (Array.isArray(error) && error.length > 0) {
        // Check nested structure [ [ { message: "...", ... } ] ]
        if (Array.isArray(error[0]) && error[0].length > 0) {
            error[0].forEach(err => {
                if (err && err.message) {
                    errors.push(err.message);
                }
            });
        }
    }
    
    // Handle error object with errors array
    if (error.errors && Array.isArray(error.errors)) {
        error.errors.forEach(err => {
            if (err && err.message) {
                errors.push(err.message);
            }
        });
    }
    
    return errors;
}