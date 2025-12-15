<!-- components/ErrorDisplay.vue -->
<template>
    <div v-if="displayError" class="error-display-container">
        <div :class="errorContainerClasses">
            <div class="flex flex-col items-center">
                <!-- Error Icon -->
                <div :class="errorIconClasses">
                    <i :class="errorIcon"></i>
                </div>
                
                <!-- Error Title -->
                <h3 class="text-xl font-bold text-red-700 dark:text-red-300 mb-2">
                    {{ errorTitle }}
                </h3>
                
                <!-- Main Error Message -->
                <p class="text-red-600 text-center dark:text-red-400 mb-3">
                    {{ displayError.message }}.
                </p>
                
                <!-- Additional Guidance for Timeout -->
                <div v-if="displayError.isTimeout">
                    <p class="text-amber-600 dark:text-amber-400 mb-4">
                        <i class="pi pi-clock mr-2"></i>
                        The request took too long to complete.
                    </p>
                </div>
                
                <!-- Additional Guidance for Network Errors -->
                <div v-else-if="isNetworkError">
                    <p class="text-red-600 dark:text-red-400 mb-4">
                        <i class="pi pi-wifi-slash mr-2"></i>
                        Please check your internet connection and try again.
                    </p>
                </div>
                
                <!-- Action Button -->
                <div class="flex gap-3 mt-4">
                    <Button 
                        label="Retry" 
                        icon="pi pi-refresh" 
                        @click="$emit('retry')" 
                        size="small"
                        severity="danger"
                        :loading="isLoading"
                    />
                </div>
                
                <!-- Technical Details -->
                <div v-if="showTechnicalDetails" class="mt-4 pt-4 border-t border-red-200 dark:border-red-800 w-full">
                    <p class="text-xs text-red-500 dark:text-red-400 text-left">
                        <template v-if="displayError.operation && displayError.operation !== 'unknown'">
                            <strong>Operation:</strong> <span class="uppercase">{{ displayError.operation }}</span><br>
                        </template>
                        <template v-if="displayError.code">
                            <strong>Code:</strong> {{ displayError.code }}<br>
                        </template>
                        <strong>Time:</strong> {{ currentTime }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { formatErrorForDisplay } from '@/utils/errorHelper'

const props = defineProps({
    error: {
        type: [String, Object],
        default: null
    },
    compact: {
        type: Boolean,
        default: false
    },
    showTechnicalDetails: {
        type: Boolean,
        default: process.env.NODE_ENV === 'development'
    },
    isLoading: {
        type: Boolean,
        default: false
    },
    customTitle: {
        type: String,
        default: null
    }
})

defineEmits(['retry'])

// Reactive current time
const currentTime = ref('')

// Update time every minute
let timeInterval
onMounted(() => {
    updateTime()
    timeInterval = setInterval(updateTime, 60000)
})

onUnmounted(() => {
    if (timeInterval) {
        clearInterval(timeInterval)
    }
})

const updateTime = () => {
    currentTime.value = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    })
}

const displayError = computed(() => {
    return formatErrorForDisplay(props.error)
})

// Generate dynamic title
const errorTitle = computed(() => {
    if (props.customTitle) {
        return `Failed to Load ${props.customTitle}`
    }
    
    if (!displayError.value) return 'Error'
    
    const operation = displayError.value.operation || ''
    
    if (operation.includes('TERMS')) {
        return 'Failed to Load Terms and Conditions'
    } else if (operation.includes('PRIVACY')) {
        return 'Failed to Load Privacy Policy'
    } else if (operation.includes('DMCA')) {
        return 'Failed to Load DMCA Policy'
    } else if (operation.includes('FAIR_PLAY') || operation.includes('FAIRPLAY')) {
        return 'Failed to Load Fair Play Policy'
    } else if (operation.includes('COOKIES')) {
        return 'Failed to Load Cookie Policy'
    } else if (operation.includes('UI_SETTINGS')) {
        return 'Failed to Load Site Status'
    } else if (operation.includes('CAROUSEL')) {
        return 'Failed to Load Carousel Images'
    }
    
    return displayError.value.title
})

const isNetworkError = computed(() => {
    if (!displayError.value) return false
    const message = displayError.value.message?.toLowerCase() || ''
    const title = displayError.value.title?.toLowerCase() || ''
    return message.includes('network') || 
           message.includes('connection') || 
           message.includes('offline') ||
           title.includes('network') ||
           displayError.value.code === 'unavailable'
})

// Class computations
const errorContainerClasses = computed(() => {
    if (!displayError.value) return ''
    const base = 'rounded-lg p-8 max-w-md mx-auto'
    const type = 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
    
    return props.compact 
        ? `${type} ${base} p-6`
        : `${type} ${base}`
})

const errorIconClasses = computed(() => {
    if (!displayError.value) return ''
    return 'p-3 bg-red-100 dark:bg-red-800 rounded-full mb-4'
})

const errorIcon = computed(() => {
    if (!displayError.value) return ''
    
    if (displayError.value.isTimeout) {
        return 'pi pi-clock text-2xl text-amber-600 dark:text-amber-400'
    } else if (isNetworkError.value) {
        return 'pi pi-wifi-slash text-2xl text-yellow-600 dark:text-yellow-400'
    }
    
    return 'pi pi-exclamation-triangle text-2xl text-red-600 dark:text-red-400'
})
</script>