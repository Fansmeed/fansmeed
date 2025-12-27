// stores/userClubsStore.js
import { defineStore } from 'pinia'
import { useUiStore } from './uiStore'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebaseInit'

export const USER_CLUBS_OPERATIONS = {
    LOAD_CLUBS: 'LOAD_CLUBS'
}

export const useUserClubsStore = defineStore('userClubs', {
    state: () => ({
        clubs: []
    }),

    getters: {
        allClubs: (state) => {
            return state.clubs
                .filter(club => club.image && club.image.trim() !== '')
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        },
        hasClubs: (state) => state.clubs.length > 0,
        totalClubs: (state) => state.clubs.length
    },

    actions: {
        async loadClubs() {
            const uiStore = useUiStore()
            const key = USER_CLUBS_OPERATIONS.LOAD_CLUBS

            return await uiStore.withOperation(
                key,
                async () => {
                    try {
                        const settingsRef = doc(db, 'settings', 'clubs')
                        const settingsDoc = await getDoc(settingsRef)
                        
                        if (settingsDoc.exists()) {
                            const data = settingsDoc.data()
                            const availableClubs = data.availableClubs || []
                            
                            // Load individual club data
                            const clubs = []
                            for (const clubName of availableClubs.sort()) { // Sort alphabetically
                                const clubData = data[clubName]
                                if (clubData) {
                                    clubs.push({
                                        name: clubName,
                                        image: clubData.clubImage || ''
                                    })
                                }
                            }
                            
                            this.clubs = clubs
                            return clubs
                        } else {
                            this.clubs = []
                            return []
                        }
                    } catch (error) {
                        console.error('Error loading clubs:', error)
                        throw error
                    }
                }
            )
        }
    }
})