import { defineStore } from 'pinia'

export const useNavigationStore = defineStore('navigation', {
    state: () => ({
        isVisible: true
    }),
    actions: {
        setVisibility(visible) {
            this.isVisible = visible
        },
        // Optional: Toggle visibility
        toggleVisibility() {
            this.isVisible = !this.isVisible
        }
    },
    getters: {
        // Optional: Get current visibility state
        getVisibility: (state) => state.isVisible
    }
})