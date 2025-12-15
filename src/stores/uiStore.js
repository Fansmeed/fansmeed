// stores/uiStore.js
import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
    state: () => ({
        loadingStates: {},
        errorStates: {},
        successStates: {},
        operationTimeouts: {} // Track timeouts for operations
    }),

    getters: {
        isLoading: (state) => (key) => !!state.loadingStates[key],
        getError: (state) => (key) => state.errorStates[key] || null,
        getSuccess: (state) => (key) => state.successStates[key] || null,
        hasAnyLoading: (state) => Object.values(state.loadingStates).some(Boolean),
        getAllErrors: (state) => state.errorStates,
    },

    actions: {
        // Core state management
        setLoading(key, value) {
            this.loadingStates[key] = value
        },

        setError(key, value) {
            this.errorStates[key] = value
        },

        setSuccess(key, value) {
            this.successStates[key] = value
        },

        // Clear timeout if exists
        clearTimeoutForOperation(key) {
            if (this.operationTimeouts[key]) {
                clearTimeout(this.operationTimeouts[key])
                delete this.operationTimeouts[key]
            }
        },

        // Batch operations
        setMultipleLoading(keys, value) {
            keys.forEach(key => {
                this.loadingStates[key] = value
            })
        },

        setMultipleErrors(errors) {
            Object.entries(errors).forEach(([key, value]) => {
                this.errorStates[key] = value
            })
        },

        // Clear methods using delete
        clearError(key) {
            delete this.errorStates[key]
        },

        clearSuccess(key) {
            delete this.successStates[key]
        },

        clearAllErrors() {
            this.errorStates = {}
        },

        clearAllSuccess() {
            this.successStates = {}
        },

        clearAllLoading() {
            this.loadingStates = {}
            // Clear all timeouts when clearing loading
            Object.keys(this.operationTimeouts).forEach(key => {
                this.clearTimeoutForOperation(key)
            })
        },

        // Operation wrapper with timeout support
        async withOperation(key, operation, options = {}) {
            const {
                autoClearError = true,
                autoClearSuccess = true,
                successMessage = null,
                throwOnError = true,
                timeout = 30000, // 30 seconds default timeout
                timeoutMessage = `Operation "${key}" timed out after ${timeout/1000} seconds`
            } = options

            try {
                // Set loading state
                this.setLoading(key, true)
                
                // Clear previous state
                if (autoClearError) this.clearError(key)
                if (autoClearSuccess) this.clearSuccess(key)
                
                // Clear any existing timeout
                this.clearTimeoutForOperation(key)

                // Create timeout promise
                const timeoutPromise = new Promise((_, reject) => {
                    this.operationTimeouts[key] = setTimeout(() => {
                        const timeoutError = new Error(timeoutMessage)
                        timeoutError.name = 'TimeoutError'
                        timeoutError.code = 'timeout'
                        reject(timeoutError)
                    }, timeout)
                })

                // Race between operation and timeout
                const result = await Promise.race([
                    operation(),
                    timeoutPromise
                ])

                // Clear timeout since operation succeeded
                this.clearTimeoutForOperation(key)

                // Set success if message provided
                if (successMessage) {
                    this.setSuccess(key, successMessage)
                }

                return result

            } catch (error) {
                console.error(`Operation ${key} failed:`, error)
                
                // Ensure timeout is cleared on error
                this.clearTimeoutForOperation(key)

                const errorMessage = error.message || 'An unexpected error occurred'
                const enhancedError = {
                    ...error,
                    message: errorMessage,
                    operation: key,
                    isTimeout: error.name === 'TimeoutError'
                }
                
                this.setError(key, enhancedError)

                if (throwOnError) {
                    throw enhancedError
                }

                return null
            } finally {
                // Ensure loading is stopped
                this.setLoading(key, false)
                // Ensure timeout is cleared
                this.clearTimeoutForOperation(key)
            }
        },
    }
})