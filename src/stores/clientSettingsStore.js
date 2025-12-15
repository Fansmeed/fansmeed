// stores/clientSettingsStore.js - Updated with loadingStore integration
import { defineStore } from 'pinia'
import { useUiStore } from './uiStore'
import { useLoadingStore } from '@/stores/loading'  // Add this import
import {
    doc,
    getDoc,
    onSnapshot
} from 'firebase/firestore'
import { db } from '@/firebase/firebaseInit'

export const CLIENT_SETTINGS_OPERATIONS = {
    LOAD_UI_SETTINGS: 'LOAD_UI_SETTINGS',
    LOAD_SITE_ACCESS: 'LOAD_SITE_ACCESS',
    START_UI_LISTENER: 'START_UI_LISTENER',
    START_SITE_ACCESS_LISTENER: 'START_SITE_ACCESS_LISTENER',
    STOP_ALL_LISTENERS: 'STOP_ALL_LISTENERS'
}

export const useClientSettingsStore = defineStore('clientSettings', {
    state: () => ({
        // UI Settings
        uiSettings: null,
        
        // Site Access Settings
        siteAccess: null,
        
        // Listener references for cleanup
        listeners: {
            uiSettings: null,
            siteAccess: null
        },
        
        // Flag to track if real-time listeners are active
        isListening: {
            uiSettings: false,
            siteAccess: false
        }
    }),

    getters: {
        // UI Settings getters - return null if not loaded
        getUiSettings: (state) => state.uiSettings,
        
        getSiteStatus: (state) => state.uiSettings ? {
            maintenanceMode: state.uiSettings.maintenanceMode,
            siteLockdown: state.uiSettings.siteLockdown
        } : null,
        
        getQuizControls: (state) => state.uiSettings ? {
            pauseQuizzes: state.uiSettings.pauseQuizzes,
            pauseLeagueQuiz: state.uiSettings.pauseLeagueQuiz,
            pauseClubQuiz: state.uiSettings.pauseClubQuiz,
            pauseChallenges: state.uiSettings.pauseChallenges,
            disablePaidQuiz: state.uiSettings.disablePaidQuiz
        } : null,
        
        getTransactionControls: (state) => state.uiSettings ? {
            disableWithdrawal: state.uiSettings.disableWithdrawal,
            disableDeposit: state.uiSettings.disableDeposit
        } : null,
        
        getAdminControls: (state) => state.uiSettings ? {
            enableRegistration: state.uiSettings.enableRegistration
        } : null,
        
        getContactInfo: (state) => state.uiSettings ? {
            contactEmail: state.uiSettings.contactEmail,
            contactPhoneNumbers: state.uiSettings.contactPhoneNumbers
        } : null,

        // Site Access getters - return null if not loaded
        getSiteAccess: (state) => state.siteAccess,
        
        getPermittedCountries: (state) => state.siteAccess?.permittedCountries || [],
        
        getCountryConfigs: (state) => state.siteAccess?.countryConfigs || {},
        
        getCountryConfig: (state) => (countryName) => 
            state.siteAccess?.countryConfigs?.[countryName],
            
        getStateConfig: (state) => (countryName, stateName) => 
            state.siteAccess?.countryConfigs?.[countryName]?.stateConfigs?.[stateName],
        
        // Feature access checkers - return null if settings not loaded
        canAccessQuizzes: (state) => state.uiSettings ? !state.uiSettings.pauseQuizzes : null,
        
        canAccessPaidQuizzes: (state) => state.uiSettings ? 
            !state.uiSettings.disablePaidQuiz && !state.uiSettings.pauseQuizzes : null,
        
        canAccessLeagueQuiz: (state) => state.uiSettings ? 
            !state.uiSettings.pauseLeagueQuiz && !state.uiSettings.pauseQuizzes : null,
        
        canAccessClubQuiz: (state) => state.uiSettings ? 
            !state.uiSettings.pauseClubQuiz && !state.uiSettings.pauseQuizzes : null,
        
        canAccessChallenges: (state) => state.uiSettings ? 
            !state.uiSettings.pauseChallenges && !state.uiSettings.pauseQuizzes : null,
        
        canWithdraw: (state) => state.uiSettings ? !state.uiSettings.disableWithdrawal : null,
        
        canDeposit: (state) => state.uiSettings ? !state.uiSettings.disableDeposit : null,
        
        canRegister: (state) => state.uiSettings?.enableRegistration,
        
        // Get all permitted countries and states in alphabetical order
        getPermittedRegions: (state) => {
            if (!state.siteAccess?.permittedCountries) {
                return {
                    countries: [],
                    regions: []
                }
            }

            const result = {
                countries: [],
                regions: []
            }

            // Get countries in alphabetical order
            const countryNames = [...state.siteAccess.permittedCountries].sort()
            
            countryNames.forEach(countryName => {
                result.countries.push(countryName)
                
                // Get country config
                const countryConfig = state.siteAccess.countryConfigs?.[countryName]
                if (countryConfig?.permittedStates) {
                    // Sort states alphabetically
                    const stateNames = [...countryConfig.permittedStates].sort()
                    
                    stateNames.forEach(stateName => {
                        result.regions.push({
                            country: countryName,
                            state: stateName,
                            fullName: `${stateName}, ${countryName}`
                        })
                    })
                }
            })

            // Sort regions by full name
            result.regions.sort((a, b) => a.fullName.localeCompare(b.fullName))

            return result
        },

        // Get formatted display string
        getFormattedRegionsDisplay: (state) => {
            if (!state.siteAccess?.permittedCountries?.length) {
                return ''
            }

            const regions = []
            
            const countryNames = [...state.siteAccess.permittedCountries].sort()
            
            countryNames.forEach(countryName => {
                const countryConfig = state.siteAccess.countryConfigs?.[countryName]
                
                if (countryConfig?.permittedStates?.length) {
                    const stateNames = [...countryConfig.permittedStates].sort()
                    regions.push(`${countryName}: ${stateNames.join(', ')}`)
                } else {
                    regions.push(countryName)
                }
            })
            
            return regions.join('; ')
        }
    },

    actions: {
        /**
         * Load UI Settings (one-time fetch)
         */
        async loadUiSettings() {
            const uiStore = useUiStore()
            const loadingStore = useLoadingStore()  // Add this
            const key = CLIENT_SETTINGS_OPERATIONS.LOAD_UI_SETTINGS

            return await uiStore.withOperation(
                key,
                async () => {
                    try {
                        const settingsDoc = await getDoc(doc(db, 'settings', 'uiSettings'))

                        if (settingsDoc.exists()) {
                            const data = settingsDoc.data()
                            this.uiSettings = {
                                ...data,
                                lastUpdated: data.lastUpdated?.toDate() || null
                            }
                            
                            // Update loading store with site status
                            const siteStatus = {
                                maintenanceMode: data.maintenanceMode,
                                siteLockdown: data.siteLockdown
                            }
                            loadingStore.setSiteStatus(siteStatus)
                        } else {
                            this.uiSettings = null
                            loadingStore.setSiteStatus({})
                        }

                        return this.uiSettings
                    } catch (error) {
                        console.error('Error loading UI settings:', error)
                        loadingStore.setSiteStatusError(error)  // Update loading store on error
                        throw error
                    }
                },
                {
                    timeout: 30000,
                    timeoutMessage: 'Loading site settings timed out'
                }
            )
        },

        /**
         * Start real-time listener for UI Settings
         */
        async startUiSettingsListener() {
            const uiStore = useUiStore()
            const loadingStore = useLoadingStore()  // Add this
            const key = CLIENT_SETTINGS_OPERATIONS.START_UI_LISTENER

            return await uiStore.withOperation(
                key,
                async () => {
                    try {
                        // Stop existing listener if any
                        if (this.listeners.uiSettings) {
                            this.listeners.uiSettings()
                            this.listeners.uiSettings = null
                        }

                        // Start new real-time listener
                        const unsubscribe = onSnapshot(
                            doc(db, 'settings', 'uiSettings'),
                            (docSnapshot) => {
                                if (docSnapshot.exists()) {
                                    const data = docSnapshot.data()
                                    this.uiSettings = {
                                        ...data,
                                        lastUpdated: data.lastUpdated?.toDate() || null
                                    }
                                    
                                    // Update loading store with new site status
                                    const siteStatus = {
                                        maintenanceMode: data.maintenanceMode,
                                        siteLockdown: data.siteLockdown
                                    }
                                    loadingStore.setSiteStatus(siteStatus)
                                } else {
                                    this.uiSettings = null
                                    loadingStore.setSiteStatus({})
                                }
                            },
                            (error) => {
                                console.error('UI Settings listener error:', error)
                                // Update loading store with error
                                loadingStore.setSiteStatusError(error)
                            }
                        )

                        this.listeners.uiSettings = unsubscribe
                        this.isListening.uiSettings = true
                        
                        return unsubscribe
                    } catch (error) {
                        console.error('Error starting UI settings listener:', error)
                        loadingStore.setSiteStatusError(error)  // Update loading store on error
                        throw error
                    }
                },
                {
                    timeout: 30000,
                    timeoutMessage: 'Starting UI settings listener timed out'
                }
            )
        },

        /**
         * Load Site Access Settings (one-time fetch)
         */
        async loadSiteAccess() {
            const uiStore = useUiStore()
            const key = CLIENT_SETTINGS_OPERATIONS.LOAD_SITE_ACCESS

            return await uiStore.withOperation(
                key,
                async () => {
                    try {
                        const siteAccessDoc = await getDoc(doc(db, 'settings', 'site-access'))

                        if (siteAccessDoc.exists()) {
                            const data = siteAccessDoc.data()
                            this.siteAccess = {
                                ...data,
                                lastUpdated: data.lastUpdated?.toDate() || null
                            }
                        } else {
                            this.siteAccess = null
                        }

                        return this.siteAccess
                    } catch (error) {
                        console.error('Error loading site access:', error)
                        throw error
                    }
                },
                {
                    timeout: 30000,
                    timeoutMessage: 'Loading site access settings timed out'
                }
            )
        },

        /**
         * Start real-time listener for Site Access
         */
        async startSiteAccessListener() {
            const uiStore = useUiStore()
            const key = CLIENT_SETTINGS_OPERATIONS.START_SITE_ACCESS_LISTENER

            return await uiStore.withOperation(
                key,
                async () => {
                    try {
                        // Stop existing listener if any
                        if (this.listeners.siteAccess) {
                            this.listeners.siteAccess()
                            this.listeners.siteAccess = null
                        }

                        // Start new real-time listener
                        const unsubscribe = onSnapshot(
                            doc(db, 'settings', 'site-access'),
                            (docSnapshot) => {
                                if (docSnapshot.exists()) {
                                    const data = docSnapshot.data()
                                    this.siteAccess = {
                                        ...data,
                                        lastUpdated: data.lastUpdated?.toDate() || null
                                    }
                                } else {
                                    this.siteAccess = null
                                }
                            },
                            (error) => {
                                console.error('Site Access listener error:', error)
                            }
                        )

                        this.listeners.siteAccess = unsubscribe
                        this.isListening.siteAccess = true
                        
                        return unsubscribe
                    } catch (error) {
                        console.error('Error starting site access listener:', error)
                        throw error
                    }
                },
                {
                    timeout: 30000,
                    timeoutMessage: 'Starting site access listener timed out'
                }
            )
        },

        /**
         * Start all real-time listeners
         */
        async startAllListeners() {
            await Promise.all([
                this.startUiSettingsListener(),
                this.startSiteAccessListener()
            ])
        },

        /**
         * Stop all real-time listeners
         */
        async stopAllListeners() {
            const uiStore = useUiStore()
            const key = CLIENT_SETTINGS_OPERATIONS.STOP_ALL_LISTENERS

            return await uiStore.withOperation(
                key,
                async () => {
                    try {
                        // Stop UI settings listener
                        if (this.listeners.uiSettings) {
                            this.listeners.uiSettings()
                            this.listeners.uiSettings = null
                            this.isListening.uiSettings = false
                        }

                        // Stop site access listener
                        if (this.listeners.siteAccess) {
                            this.listeners.siteAccess()
                            this.listeners.siteAccess = null
                            this.isListening.siteAccess = false
                        }
                    } catch (error) {
                        console.error('Error stopping listeners:', error)
                        throw error
                    }
                },
                {
                    timeout: 10000,
                    timeoutMessage: 'Stopping listeners timed out'
                }
            )
        },

        /**
         * Check if a specific country/state is allowed to access the site
         */
        isRegionAllowed(countryName, stateName = null) {
            if (!this.siteAccess) return null
            
            const permittedCountries = this.siteAccess.permittedCountries || []
            if (!permittedCountries.includes(countryName)) {
                return false
            }
            
            const countryConfig = this.siteAccess.countryConfigs?.[countryName]
            if (!countryConfig || !countryConfig.enabled) {
                return false
            }
            
            if (stateName && countryConfig.permittedStates) {
                const stateConfig = countryConfig.stateConfigs?.[stateName]
                if (!stateConfig || !stateConfig.enabled) {
                    return false
                }
            }
            
            return true
        },

        /**
         * Check if a specific feature is allowed for a region
         */
        isFeatureAllowed(feature, countryName, stateName = null) {
            const regionAllowed = this.isRegionAllowed(countryName, stateName)
            if (regionAllowed === false) {
                return false
            }
            
            if (regionAllowed === null) {
                return null
            }
            
            let config = null
            if (stateName) {
                config = this.siteAccess.countryConfigs?.[countryName]?.stateConfigs?.[stateName]
            }
            
            if (!config) {
                config = this.siteAccess.countryConfigs?.[countryName]
            }
            
            if (!config) return true
            
            switch (feature) {
                case 'quiz':
                case 'quizzes':
                    return config.allowQuiz !== false
                case 'transaction':
                case 'transactions':
                    return config.allowTransaction !== false
                case 'registration':
                    return config.allowRegistration !== false
                case 'paid_quiz':
                    return config.allowPaidQuiz !== false
                default:
                    return true
            }
        },

        /**
         * Get maintenance/lockdown information
         */
        getMaintenanceInfo() {
            if (!this.uiSettings) return null
            
            return {
                isMaintenance: this.uiSettings.maintenanceMode,
                isLockdown: this.uiSettings.siteLockdown,
                contactEmail: this.uiSettings.contactEmail,
                contactPhone: this.uiSettings.contactPhoneNumbers?.[0],
                message: this.uiSettings.siteLockdown 
                    ? 'Site is currently under lockdown. Please try again later.'
                    : 'Site is currently under maintenance. We will be back shortly.'
            }
        }
    }
})