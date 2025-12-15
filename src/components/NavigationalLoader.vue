<!-- NavigationalLoader.vue - FIXED -->
<template>
    <!-- Show loading overlay only during initial load OR page navigation -->
    <div v-if="showLoading" class="loading-overlay">
        <div class="cube-loader">
            <div class="cube cube1"></div>
            <div class="cube cube2"></div>
            <div class="cube cube3"></div>
            <div class="cube cube4"></div>
        </div>
        
        <!-- Timeout warning - FIXED POSITIONING -->
        <div v-if="loadingTime > 15000" class="timeout-warning absolute bottom-70">
            <p class="text-sm text-gray-500 mt-4">
                <span v-if="loadingTime <= 50000">
                    Taking longer than usual... 
                    <span v-if="loadingTime > 25000" class="text-amber-500">
                        ({{ Math.floor(loadingTime/1000) }}s)
                    </span>
                </span>
                <span v-else class="text-red-500 cursor-pointer hover:underline" @click="forceReload">
                    Taking too long! Click here to reload
                    <span class="text-red-600 font-bold">
                        ({{ Math.floor(loadingTime/1000) }}s)
                    </span>
                </span>
            </p>
        </div>
    </div>
    
    <!-- Show slot content when not loading -->
    <slot v-else />
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useLoadingStore } from '@/stores/loading'

const loadingStore = useLoadingStore()

const loadingStartTime = ref(null)
const loadingTime = ref(0)
let intervalId = null

// Show loading during initial site status check OR page navigation
const showLoading = computed(() => {
    return loadingStore.shouldShowLoading
})

// Watch loading state to track time
watch(showLoading, (isLoading) => {
    if (isLoading && !intervalId) {
        loadingStartTime.value = Date.now()
        intervalId = setInterval(() => {
            loadingTime.value = Date.now() - loadingStartTime.value
        }, 1000)
    } else if (!isLoading && intervalId) {
        clearInterval(intervalId)
        intervalId = null
        loadingTime.value = 0
    }
})

// Force reload function
const forceReload = () => {
    console.log('Force reload clicked!')
    
    // Clear any pending timeouts or intervals
    if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
    }
    
    // Reset loading time
    loadingTime.value = 0
    
    // Reload the page
    window.location.reload()
}

// Cleanup interval
onUnmounted(() => {
    if (intervalId) {
        clearInterval(intervalId)
    }
})
</script>

<style scoped>
.loading-overlay {
    z-index: 10000;
    width: 100%;
    background: var(--color-background);
    position: fixed;
    top: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
}

.cube-loader {
    position: relative;
    width: 60px;
    height: 60px;
    margin: auto;
}

.cube {
    position: absolute;
    width: 50%;
    height: 50%;
    background-color: var(--color-primary);
    border: 2px solid var(--color-background);
    animation: foldCube 2.4s infinite linear;
}

.cube1 {
    top: 0;
    left: 0;
    transform-origin: 100% 100%;
}

.cube2 {
    top: 0;
    right: 0;
    transform-origin: 0 100%;
}

.cube3 {
    bottom: 0;
    right: 0;
    transform-origin: 0 0;
}

.cube4 {
    bottom: 0;
    left: 0;
    transform-origin: 100% 0;
}

@keyframes foldCube {
    0%, 10% {
        transform: perspective(140px) rotateX(-180deg);
        opacity: 0;
    }
    25%, 75% {
        transform: perspective(140px) rotateX(0deg);
        opacity: 1;
    }
    90%, 100% {
        transform: perspective(140px) rotateY(180deg);
        opacity: 0;
    }
}

.cube1 {
    animation-delay: 0.3s;
}

.cube2 {
    animation-delay: 0.6s;
}

.cube3 {
    animation-delay: 0.9s;
}

.cube4 {
    animation-delay: 1.2s;
}

.timeout-warning {
    margin-top: 100px; /* Add space between spinner and text */
    text-align: center;
    animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
</style>