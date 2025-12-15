// stores/loading.js - Updated with router-compatible methods
import { defineStore } from 'pinia'

export const useLoadingStore = defineStore('loading', {
    state: () => ({
        showLoadingOverlay: false,
        showTimeoutWarning: false,
        loadingStartTime: null,
        timeoutId: null,
        siteStatus: null,
        siteStatusError: null,
        siteStatusLoading: true,
        hasInitialized: false,
        pageLoading: false, // Add this for router compatibility
        operations: new Set() // Track operations for router
    }),
    
    getters: {
        isLoading: (state) => state.showLoadingOverlay,
        loadingDuration: (state) => {
            if (!state.loadingStartTime) return 0
            return Date.now() - state.loadingStartTime
        },
        shouldShowLoading: (state) => {
            // Show loading if:
            // 1. We're still checking site status (initial load), OR
            // 2. Page is loading (router navigation)
            return (state.showLoadingOverlay && !state.hasInitialized) || 
                   state.pageLoading
        }
    },
    
    actions: {
        // Core loading methods
        startLoading() {
            this.showLoadingOverlay = true
            this.loadingStartTime = Date.now()
            this.showTimeoutWarning = false
            
            // Clear any existing timeout
            if (this.timeoutId) {
                clearTimeout(this.timeoutId)
            }
            
            // Set timeout warning
            this.timeoutId = setTimeout(() => {
                if (this.showLoadingOverlay) {
                    this.showTimeoutWarning = true
                }
            }, 15000)
            
            // this.preventBodyInteraction()
        },
        
        stopLoading() {
            this.showLoadingOverlay = false
            this.loadingStartTime = null
            this.showTimeoutWarning = false
            
            if (this.timeoutId) {
                clearTimeout(this.timeoutId)
                this.timeoutId = null
            }
            
            this.restoreBodyInteraction()
        },
        
        // Site status methods
        setSiteStatus(status) {
            this.siteStatus = status
            this.siteStatusLoading = false
            this.siteStatusError = null
            this.hasInitialized = true
            this.stopLoading()
        },
        
        setSiteStatusError(error) {
            this.siteStatusError = error
            this.siteStatusLoading = false
            this.hasInitialized = true
            this.stopLoading()
        },
        
        // Router navigation methods
        startPageLoading() {
            this.pageLoading = true
            if (!this.showLoadingOverlay) {
                this.startLoading()
            }
        },
        
        finishPageLoading() {
            this.pageLoading = false
            // Only stop loading if we're not still initializing
            if (this.hasInitialized) {
                this.stopLoading()
            }
        },
        
        // Operation tracking (optional, for future use)
        startOperation(operationKey) {
            this.operations.add(operationKey)
            if (!this.showLoadingOverlay) {
                this.startLoading()
            }
        },
        
        finishOperation(operationKey) {
            this.operations.delete(operationKey)
            if (this.operations.size === 0 && this.hasInitialized) {
                this.stopLoading()
            }
        },
        
        // Body interaction helpers
        preventBodyInteraction() {
            document.body.style.overflow = 'hidden'
            // document.body.style.pointerEvents = 'none'
            document.body.style.userSelect = 'none'
            document.documentElement.style.overflow = 'hidden'
            // document.documentElement.style.pointerEvents = 'none'
        },
        
        restoreBodyInteraction() {
            document.body.style.overflow = ''
            // document.body.style.pointerEvents = ''
            document.body.style.userSelect = ''
            document.documentElement.style.overflow = ''
            // document.documentElement.style.pointerEvents = ''
        }
    }
})