// stores/pageContentStore.js
import { defineStore } from 'pinia'
import { useUiStore } from './uiStore'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebaseInit'

export const PAGE_TYPES = {
    COOKIES: 'cookies',
    DMCA: 'dmca',
    PRIVACY: 'privacy',
    TERMS: 'terms',
    FAIR_PLAY: 'fairPlay'
}

export const PAGE_CONTENT_OPERATIONS = {
    LOAD_PAGE_CONTENT: 'LOAD_PAGE_CONTENT'
}

export const usePageContentStore = defineStore('pageContent', {
    state: () => ({
        pages: {
            [PAGE_TYPES.COOKIES]: {
                htmlContent: null,
                lastUpdated: null
            },
            [PAGE_TYPES.DMCA]: {
                htmlContent: null,
                lastUpdated: null
            },
            [PAGE_TYPES.PRIVACY]: {
                htmlContent: null,
                lastUpdated: null
            },
            [PAGE_TYPES.TERMS]: {
                htmlContent: null,
                lastUpdated: null
            },
            [PAGE_TYPES.FAIR_PLAY]: {
                htmlContent: null,
                lastUpdated: null
            }
        }
    }),

    getters: {
        getPageContent: (state) => (pageType) => {
            return state.pages[pageType]?.htmlContent || null
        },
        getLastUpdated: (state) => (pageType) => {
            return state.pages[pageType]?.lastUpdated || null
        }
    },

    actions: {
        async loadPageContent(pageType) {
            const uiStore = useUiStore()
            const key = `${PAGE_CONTENT_OPERATIONS.LOAD_PAGE_CONTENT}_${pageType}`

            return await uiStore.withOperation(
                key,
                async () => {
                    const pageRef = doc(db, 'settings', pageType)
                    const pageDoc = await getDoc(pageRef)

                    if (!pageDoc.exists()) {
                        throw new Error(`Page content not found for ${pageType}`)
                    }

                    const data = pageDoc.data()
                    
                    let lastUpdated = null
                    if (data.lastUpdated?.toDate) {
                        lastUpdated = data.lastUpdated.toDate().toISOString()
                    } else {
                        lastUpdated = data.lastUpdated || new Date().toISOString()
                    }

                    const htmlContent = data.currentContent || ''

                    this.pages[pageType] = {
                        htmlContent: htmlContent,
                        lastUpdated: lastUpdated
                    }

                    return htmlContent
                }
            )
        },

        clearPageCache(pageType) {
            if (this.pages[pageType]) {
                this.pages[pageType].htmlContent = null
                this.pages[pageType].lastUpdated = null
            }
        },

        clearAllCache() {
            Object.values(PAGE_TYPES).forEach(pageType => {
                this.clearPageCache(pageType)
            })
        }
    }
})