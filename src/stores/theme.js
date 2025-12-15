// stores/theme.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useThemeStore = defineStore('theme', () => {
    const isDark = ref(localStorage.getItem('appTheme') === 'dark');
    const isHovered = ref(false);

    // Initialize theme on store creation
    function initializeTheme() {
        const savedTheme = localStorage.getItem('appTheme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) {
            isDark.value = savedTheme === 'dark';
        } else {
            isDark.value = prefersDark;
        }

        // Apply the initial theme to both your app and Element Plus
        if (isDark.value) {
            document.documentElement.classList.add('app-dark-mode', 'dark');
        } else {
            document.documentElement.classList.remove('app-dark-mode', 'dark');
        }
    }

    // Toggle theme function
    function toggleTheme() {
        isDark.value = !isDark.value;
        localStorage.setItem('appTheme', isDark.value ? 'dark' : 'light');

        // Update both theme classes
        if (isDark.value) {
            document.documentElement.classList.add('app-dark-mode', 'dark');
        } else {
            document.documentElement.classList.remove('app-dark-mode', 'dark');
        }
    }

    // Set theme explicitly
    function setTheme(dark) {
        isDark.value = dark;
        localStorage.setItem('appTheme', dark ? 'dark' : 'light');

        if (dark) {
            document.documentElement.classList.add('app-dark-mode', 'dark');
        } else {
            document.documentElement.classList.remove('app-dark-mode', 'dark');
        }
    }

    // Initialize theme when store is created
    initializeTheme();

    return {
        isDark: computed(() => isDark.value),
        isHovered,
        toggleTheme,
        setTheme,
        initializeTheme
    };
});