<!-- Terms.vue -->
<template>
    <div class="relative flex min-h-screen w-full flex-col">
        <main class="flex-grow">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8">
                <div class="mx-auto max-w-5xl">
                    
                    <!-- Loading State -->
                    <div v-if="uiStore.isLoading(pageLoadingKey)"
                        class="flex flex-col items-center justify-center text-center pt-5">
                        <el-skeleton :rows="10" animated class="space-y-8 w-full">
                            <template #template>
                                <div class="space-y-8">
                                    <div class="text-center flex flex-col mb-12">
                                        <el-skeleton-item variant="h1" class="h-12 !w-1/2 mx-auto mb-4" />
                                        <el-skeleton-item variant="text" class="h-6 !w-1/4 mx-auto" />
                                    </div>
                                    
                                    <div class="space-y-8 bg-white dark:bg-neutral-900 p-6 sm:p-8 md:p-10 rounded-xl shadow-lg">
                                        <el-skeleton-item variant="h2" class="h-8 w-2/3 mb-4" />
                                        <el-skeleton-item variant="text" class="w-full mb-2" />
                                        <el-skeleton-item variant="text" class="w-full mb-2" />
                                        <el-skeleton-item variant="text" class="w-3/4 mb-6" />
                                    </div>
                                </div>
                            </template>
                        </el-skeleton>
                    </div>
                    
                    <!-- Error State -->
                    <div v-else-if="displayError"
                        class="text-center py-16">
                        <ErrorDisplay 
                            :error="displayError" 
                            @retry="loadContent"
                        />
                    </div>
                    
                    <!-- Success State -->
                    <div v-else>
                        <div v-if="htmlContent" class="space-y-8">
                            <div class="text-center flex flex-col mb-12">
                                <h1 class="text-4xl md:text-5xl font-black tracking-[-0.033em] text-primary">
                                    Terms and Conditions
                                </h1>
                                <p class="mt-4 text-lg text-text-light/80 dark:text-text-dark/80"
                                    v-if="lastUpdated">
                                    Last Updated: {{ formatDate(lastUpdated) }}
                                </p>
                            </div>
                            
                            <div class="space-y-8 bg-white dark:bg-neutral-900 p-6 sm:p-8 md:p-10 rounded-xl shadow-lg">
                                <div class="ql-snow">
                                    <div class="ql-editor" v-html="htmlContent" />
                                </div>
                            </div>
                        </div>
                        
                        <!-- Empty State -->
                        <div v-else class="text-center py-16">
                            <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-8 max-w-md mx-auto">
                                <div class="flex flex-col items-center">
                                    <div class="p-3 bg-yellow-100 dark:bg-yellow-800 rounded-full mb-4">
                                        <i class="pi pi-info-circle text-2xl text-yellow-600 dark:text-yellow-400"></i>
                                    </div>
                                    <h3 class="text-xl font-bold text-yellow-700 dark:text-yellow-300 mb-2">
                                        No Content Available
                                    </h3>
                                    <p class="text-yellow-600 dark:text-yellow-400 mb-4">
                                        Terms and conditions content is not available at the moment.
                                    </p>
                                    <Button 
                                        label="Retry" 
                                        icon="pi pi-refresh" 
                                        @click="loadContent" 
                                        size="small"
                                        severity="warning" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { usePageContentStore, PAGE_TYPES, PAGE_CONTENT_OPERATIONS } from '@/stores/pageContentStore'
import { useUiStore } from '@/stores/uiStore'
import { formatErrorForDisplay } from '@/utils/errorHelper'
import ErrorDisplay from '@/components/ErrorDisplay.vue'

const pageContentStore = usePageContentStore()
const uiStore = useUiStore()

const pageLoadingKey = computed(() => `${PAGE_CONTENT_OPERATIONS.LOAD_PAGE_CONTENT}_${PAGE_TYPES.TERMS}`)
const htmlContent = computed(() => pageContentStore.getPageContent(PAGE_TYPES.TERMS))
const lastUpdated = computed(() => pageContentStore.getLastUpdated(PAGE_TYPES.TERMS))
const displayError = computed(() => formatErrorForDisplay(uiStore.getError(pageLoadingKey.value)))

const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date'
    try {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    } catch (error) {
        return dateString
    }
}

const loadContent = async () => {
    try {
        uiStore.clearError(pageLoadingKey.value)
        await pageContentStore.loadPageContent(PAGE_TYPES.TERMS)
    } catch (err) {
        console.error('Error loading terms and conditions:', err)
    }
}
onMounted(() => {
    loadContent()
})
</script>