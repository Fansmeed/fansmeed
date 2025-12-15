<template>
    <div class="min-h-screen flex flex-col lg:flex-row">
        <div
            class="account-head lg:w-[500px] lg:min-h-screen lg:fixed lg:top-0 lg:left-0 h-70 lg:h-screen relative overflow-hidden">
            <img :src="randomImage" alt="Registration Background" class="absolute inset-0 w-full h-full object-cover" />
            <!-- Dark Overlay -->
            <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

            <!-- Logo Centered Perfectly -->
            <div class="relative z-10 h-full flex items-center justify-center p-8">
                <div class="text-center">
                    <router-link to="/" class="align-center flex justify-center">
                        <!-- Svg Here -->
                        <div class="size-16 bg-primary rounded-lg flex items-center justify-center">
                            <i class="pi pi-users text-white text-2xl"></i>
                        </div>
                    </router-link>
                    <p class="text-white/80 mt-2 text-sm lg:text-base">Connect • Play • Win</p>
                </div>
            </div>
        </div>

        <div class="account-form-inner items-center flex-1 lg:ml-[550px]">
            <div class="account-container max-w-4xl w-full p-5 lg:p-10">
                <!-- Steps Header -->
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-neutral-800 dark:text-white mb-2"><span
                            class="text-primary border-l-7 mr-2 rounded-md"></span>Create Your Account</h1>
                    <p class="text-neutral-600 dark:text-neutral-400">Join thousands of sports enthusiasts</p>
                    <p class="text-neutral-600 dark:text-neutral-400">Already have an account?  <router-link :to="{ name: 'Login'}" class="underline text-primary font-bold">Click to login</router-link></p>
                </div>

                <!-- Scrollable Form Container -->
                <div
                    class="max-h-[calc(100vh-200px)] overflow-y-auto shadow-lg border-2 border-gray-500 dark:border-gray-400 rounded-xl">
                    <!-- Step 1: Registration Rules -->
                    <div v-show="currentStep === 0" class="mt-1">
                        <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6">
                            <div class="mb-6">
                                <h3 class="text-xl font-bold text-neutral-800 dark:text-white">Registration Requirements
                                </h3>
                                <p class="text-neutral-600 dark:text-neutral-400 mt-1">Read and accept our terms</p>
                            </div>
                            <div class="space-y-4">
                                <div v-for="(item, index) in requirements" :key="index" class="flex items-start gap-3">
                                    <div
                                        class="flex items-center justify-center size-6 rounded-full bg-primary/20 text-primary">
                                        <span class="text-sm font-bold">{{ index + 1 }}</span>
                                    </div>
                                    <p class="text-neutral-700 dark:text-neutral-300">{{ item.note }}</p>
                                </div>
                            </div>

                            <div class="mt-5 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                                <n-form-item>
                                    <n-checkbox v-model:checked="rulesAccepted">
                                        I agree to the registration requirements and <router-link :to="{ name: 'Terms'}" class="underline text-primary font-bold">Terms & Conditions</router-link>
                                    </n-checkbox>
                                </n-form-item>
                            </div>

                            <div class="flex justify-end mt-2">
                                <Button label="Continue" icon="pi pi-arrow-right" @click="nextStep"
                                    :disabled="!rulesAccepted" />
                            </div>
                        </div>
                    </div>

                    <!-- Step 2: Personal Information -->
                    <div v-show="currentStep === 1" class="mt-1">
                        <n-form ref="personalFormRef" :model="personalForm" :rules="personalRules"
                            label-placement="top">
                            <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6">
                                <div class="mb-6">
                                    <h3 class="text-xl font-bold text-neutral-800 dark:text-white">Personal Information
                                    </h3>
                                    <p class="text-neutral-600 dark:text-neutral-400 mt-1">Tell us about yourself</p>
                                </div>

                                <!-- Profile Image Upload -->
                                <div class="mb-6">
                                    <n-form-item label="Profile Picture" path="profilePicture">
                                        <n-upload :default-file-list="previewFileList" list-type="image-card" :max="1"
                                            @preview="handlePreview" @remove="handleRemove"
                                            @change="handleUploadChange" />
                                    </n-form-item>
                                    <n-modal v-model:show="showModal" preset="card" style="width: 600px"
                                        title="Profile Image Preview">
                                        <img :src="previewImageUrl" style="width: 100%">
                                    </n-modal>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <!-- First Name -->
                                    <n-form-item label="First Name" path="firstName">
                                        <n-input v-model:value="personalForm.firstName"
                                            placeholder="Enter your first name" />
                                    </n-form-item>

                                    <!-- Last Name -->
                                    <n-form-item label="Last Name" path="lastName">
                                        <n-input v-model:value="personalForm.lastName"
                                            placeholder="Enter your last name" />
                                    </n-form-item>

                                    <!-- Username -->
                                    <n-form-item label="Username" path="userName">
                                        <n-input v-model:value="personalForm.userName"
                                            placeholder="Choose a username" />
                                    </n-form-item>

                                    <!-- Date of Birth -->
                                    <n-form-item label="Date of Birth" path="dob">
                                        <div class="flex gap-3">
                                            <n-date-picker v-model:value="personalForm.dob" type="date"
                                                placeholder="Select your date of birth" class="flex-3"
                                                @update:value="calculateAge" :is-date-disabled="disableUnder18Dates" />
                                            <n-input :value="age" placeholder="Age" disabled class="flex-1" />
                                        </div>
                                    </n-form-item>

                                    <!-- Gender -->
                                    <n-form-item label="Gender" path="gender">
                                        <n-radio-group v-model:value="personalForm.gender">
                                            <n-space>
                                                <n-radio value="Male">Male</n-radio>
                                                <n-radio value="Female">Female</n-radio>
                                            </n-space>
                                        </n-radio-group>
                                    </n-form-item>

                                    <!-- Country -->
                                    <n-form-item label="Country" path="country">
                                        <n-select v-model:value="personalForm.country" filterable
                                            placeholder="Select your country" :options="countryOptions"
                                            @update:value="handleCountryChange" />
                                    </n-form-item>

                                    <!-- State -->
                                    <n-form-item label="State" path="state">
                                        <n-select v-model:value="personalForm.state" filterable
                                            placeholder="Select your state" :options="stateOptions"
                                            :disabled="!personalForm.country" />
                                    </n-form-item>

                                    <!-- Favorite Clubs -->
                                    <n-form-item class="md:col-span-2" label="Favorite Clubs" path="userClub">
                                        <n-select v-model:value="personalForm.userClub" filterable multiple
                                            placeholder="Select your favorite clubs" :options="clubOptions" />
                                    </n-form-item>
                                </div>

                                <div
                                    class="flex justify-between mt-2 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                                    <Button label="Back" icon="pi pi-arrow-left" severity="secondary"
                                        @click="prevStep" />
                                    <Button label="Continue" icon="pi pi-arrow-right" iconPos="right"
                                        @click="validatePersonalInfo" />
                                </div>
                            </div>
                        </n-form>
                    </div>

                    <!-- Step 3: Security -->
                    <div v-show="currentStep === 2" class="mt-1">
                        <n-form ref="securityFormRef" :model="securityForm" :rules="securityRules"
                            label-placement="top">
                            <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6">
                                <div class="mb-6">
                                    <h3 class="text-xl font-bold text-neutral-800 dark:text-white">Security Settings
                                    </h3>
                                    <p class="text-neutral-600 dark:text-neutral-400 mt-1">Set up your security</p>
                                </div>

                                <div class="space-y-6">
                                    <!-- Email -->
                                    <n-form-item label="Email" path="email">
                                        <n-input v-model:value="securityForm.email" type="email"
                                            placeholder="Enter your email address" />
                                    </n-form-item>

                                    <!-- Phone Number -->
                                    <n-form-item label="Phone Number" path="phoneNumber">
                                        <n-input v-model:value="securityForm.phoneNumber"
                                            placeholder="Enter your phone number" @input="trimPhoneNumber" />
                                    </n-form-item>

                                    <!-- Password -->
                                    <n-form-item label="Password" path="password"
                                        class="flex flex-col items-start !w-full">
                                        <div class="w-full">
                                            <n-input v-model:value="securityForm.password" type="password"
                                                placeholder="Create a strong password" show-password-on="click"
                                                @input="validatePasswordStrength" />

                                            <!-- Password Checklist -->
                                            <div class="mt-4 flex flex-col space-y-2 text-sm">
                                                <div v-for="(rule, index) in passwordChecklist" :key="index"
                                                    class="flex items-center gap-2">
                                                    <i class="pi text-base"
                                                        :class="rule.condition ? 'pi-check-circle text-green-500' : 'pi-circle text-gray-400'"></i>
                                                    <span :class="rule.condition ? 'text-green-600' : 'text-gray-500'">
                                                        {{ rule.label }}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </n-form-item>

                                    <!-- Confirm Password -->
                                    <n-form-item label="Confirm Password" path="confirmPassword">
                                        <n-input v-model:value="securityForm.confirmPassword" type="password"
                                            placeholder="Confirm your password" show-password-on="click"
                                            :disabled="!securityForm.password" />
                                    </n-form-item>

                                    <!-- Transaction PIN -->
                                    <n-form-item label="Transaction PIN" path="transactionPin">
                                        <n-input-otp v-model:value="securityForm.transactionPin" :length="6"
                                            :mask="false" :allow-input="onlyAllowNumber" placeholder="" />
                                    </n-form-item>

                                    <!-- Confirm Transaction PIN -->
                                    <n-form-item label="Confirm Transaction PIN" path="confirmTransactionPin">
                                        <n-input-otp v-model:value="securityForm.confirmTransactionPin" :length="6"
                                            :mask="false" :allow-input="onlyAllowNumber" placeholder=""
                                            :disabled="securityForm.transactionPin.length !== 6" />
                                    </n-form-item>
                                </div>

                                <div
                                    class="flex justify-between mt-2 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                                    <Button label="Back" icon="pi pi-arrow-left" severity="secondary"
                                        @click="prevStep" />
                                    <Button label="Continue" icon="pi pi-arrow-right" @click="validateSecurity" />
                                </div>
                            </div>
                        </n-form>
                    </div>

                    <!-- Step 4: Verification -->
                    <div v-show="currentStep === 3">
                        <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-8 text-center">
                            <div class="flex justify-center mb-6">
                                <div
                                    class="size-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <i class="pi pi-check text-3xl text-green-600 dark:text-green-400"></i>
                                </div>
                            </div>

                            <div class="mb-6">
                                <h3 class="text-2xl font-bold text-neutral-800 dark:text-white">Verification</h3>
                                <p class="text-neutral-600 dark:text-neutral-400 mt-1">Verify your account</p>
                            </div>

                            <p class="text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
                                We've sent a verification link to <strong class="text-primary">{{ securityForm.email
                                    }}</strong>.
                                Please check your email and click the verification link to activate your account.
                            </p>

                            <div class="space-y-4">
                                <p class="text-sm text-neutral-500 dark:text-neutral-400">
                                    Didn't receive the email? Check your spam folder or
                                    <a href="#" class="text-primary hover:underline">click here to resend</a>.
                                </p>

                                <Button label="Go to Login" icon="pi pi-sign-in" size="small" raised @click="goToLogin" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>




<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import Button from 'primevue/button'

const router = useRouter()
const message = useMessage()

// Random background images
const images = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDoQNwBVEvy0ww5JGRPoYshfGDaxkFgUzrCI4wOcmqWT_BJeoDW-LXdiHj4VF01-UREo6WyAp_dl6UZpizqwJ1m_Xhvj9wxl3dvN-xn_htfgs67iixvGPJoxt04r7kk7mFxzbnxmKNKVtrHpqmSxELTN_J9PRh0TFErf8CyekCCYEwVgK47H2kNSehWs5bOURHQl1KVDyLvYXYBPW6gMKnNS_6Dks0zrW75p_IBqXVb7kluPTpC5mfONvwd6teoTywBpeiue6Y2u_dR',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA2XJy7JRPHkDV4YDiJt6drHq9HnNfLw08zlPrCZV9hf4VaNERVG2zr63VsYgVqAOKDowJWxaEfkFLV1YWxpSIIHc0vaGBHCPUhHzChx-pdxBMZLwAzWlL1OeIVEkLRJOHLs2NU90O-hees9lCWF1t-VcERyd0-1XcB1GIzEj5I3eYcsUwCEpRuSO_ZEQMywhnsyitjp7pjKWx6JIdZqUTAD82hdBnn9nJ8D6OW-c4mguQ_AFrJzEp-O0K8EQ9Bc4JeJsdtZbqTxoiW'
]

const randomImage = ref('')

// Steps management
const currentStep = ref(0)
const currentStatus = ref('process')
const rulesAccepted = ref(false)

// Form refs
const personalFormRef = ref(null)
const securityFormRef = ref(null)

// Track profile picture upload
const hasProfilePicture = ref(false)

// Step 1: Requirements
const requirements = ref([
    { note: "You must be at least 18 years old to register" },
    { note: "Provide accurate personal information" },
    { note: "Agree to our Terms and Conditions" },
    { note: "Verify your email address after registration" },
    { note: "Set up strong security credentials" }
])

// Step 2: Personal Information Form
const personalForm = ref({
    firstName: '',
    lastName: '',
    userName: '',
    dob: null,
    gender: null,
    country: null,
    state: null,
    userClub: [],
    profilePicture: null
})

const age = ref('')

// Step 3: Security Form
const securityForm = ref({
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    transactionPin: [],
    confirmTransactionPin: []
})

// Password strength validation
const hasLowercase = ref(false)
const hasUppercase = ref(false)
const hasNumeric = ref(false)
const hasSpecialChar = ref(false)
const isMinLength = ref(false)

// Image upload
const previewFileList = ref([])
const showModal = ref(false)
const previewImageUrl = ref('')

// Options for selects
const countryOptions = ref([
    { label: 'Nigeria', value: 'nigeria' },
    { label: 'Ghana', value: 'ghana' },
    { label: 'Kenya', value: 'kenya' },
    { label: 'South Africa', value: 'south-africa' },
    { label: 'United States', value: 'us' },
    { label: 'United Kingdom', value: 'uk' }
])

const stateOptions = ref([])
const clubOptions = ref([
    { label: 'Manchester United', value: 'man-utd' },
    { label: 'Chelsea', value: 'chelsea' },
    { label: 'Arsenal', value: 'arsenal' },
    { label: 'Liverpool', value: 'liverpool' },
    { label: 'Manchester City', value: 'man-city' },
    { label: 'Barcelona', value: 'barcelona' },
    { label: 'Real Madrid', value: 'real-madrid' },
    { label: 'Bayern Munich', value: 'bayern' }
])

// Password checklist
const passwordChecklist = computed(() => [
    { label: 'Lowercase letter', condition: hasLowercase.value },
    { label: 'Uppercase letter', condition: hasUppercase.value },
    { label: 'Number', condition: hasNumeric.value },
    { label: 'Special character', condition: hasSpecialChar.value },
    { label: '8+ characters', condition: isMinLength.value },
])

// Form validation rules - UPDATED
const personalRules = {
    firstName: {
        required: true,
        message: 'Please enter your first name',
        trigger: ['blur', 'input']
    },
    lastName: {
        required: true,
        message: 'Please enter your last name',
        trigger: ['blur', 'input']
    },
    userName: {
        required: true,
        message: 'Please choose a username',
        trigger: ['blur', 'input']
    },
    dob: {
        required: true,
        validator: (rule, value) => {
            if (!value) {
                return new Error('Please select your date of birth')
            }

            // Calculate age from timestamp
            const birthDate = new Date(value)
            const today = new Date()
            let calculatedAge = today.getFullYear() - birthDate.getFullYear()
            const monthDiff = today.getMonth() - birthDate.getMonth()

            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--
            }

            if (calculatedAge < 18) {
                return new Error('You must be at least 18 years old')
            }

            return true
        },
        trigger: ['blur', 'change']
    },
    gender: {
        required: true,
        message: 'Please select your gender',
        trigger: ['blur', 'change']
    },
    country: {
        required: true,
        message: 'Please select your country',
        trigger: ['blur', 'change']
    },
    state: {
        required: true,
        message: 'Please select your state',
        trigger: ['blur', 'change']
    },
    profilePicture: {
        required: true,
        validator: (rule, value) => {
            if (!hasProfilePicture.value) {
                return new Error('Please upload a profile picture')
            }
            return true
        },
        trigger: ['change']
    },
    userClub: {
        required: true,
        validator: (rule, value) => {
            if (!value || value.length === 0) {
                return new Error('Please select at least one favorite club')
            }
            return true
        },
        trigger: ['blur', 'change']
    }
}

const securityRules = {
    email: {
        required: true,
        validator: (rule, value) => {
            if (!value) {
                return new Error('Please enter your email address')
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return new Error('Please enter a valid email address')
            }
            return true
        },
        trigger: ['blur', 'input']
    },
    phoneNumber: {
        required: true,
        message: 'Please enter your phone number',
        trigger: ['blur', 'input']
    },
    password: {
        required: true,
        validator: (rule, value) => {
            if (!value) {
                return new Error('Please enter a password')
            }
            if (value.length < 8) {
                return new Error('Password must be at least 8 characters')
            }
            if (!hasLowercase.value || !hasUppercase.value || !hasNumeric.value || !hasSpecialChar.value) {
                return new Error('Password must meet all requirements')
            }
            return true
        },
        trigger: ['blur', 'input']
    },
    confirmPassword: {
        required: true,
        validator: (rule, value) => {
            if (!value) {
                return new Error('Please confirm your password')
            }
            if (value !== securityForm.value.password) {
                return new Error('Passwords do not match')
            }
            return true
        },
        trigger: ['blur', 'input']
    },
    transactionPin: {
        required: true,
        validator: (rule, value) => {
            if (!value || value.length !== 6) {
                return new Error('Please enter a 6-digit transaction PIN')
            }
            return true
        },
        trigger: ['blur', 'finish']
    },
    confirmTransactionPin: {
        required: true,
        validator: (rule, value) => {
            if (!value || value.length !== 6) {
                return new Error('Please confirm your 6-digit transaction PIN')
            }
            // Convert arrays to strings for comparison
            const pin1 = securityForm.value.transactionPin.join('')
            const pin2 = value.join('')
            if (pin1 !== pin2) {
                return new Error('Transaction PINs do not match')
            }
            return true
        },
        trigger: ['blur', 'finish']
    }
}

// Methods
const onlyAllowNumber = (value) => !value || /^\d+$/.test(value)

// Fix for date validation - only allow dates where user is at least 18 years old
const disableUnder18Dates = (timestamp) => {
    const selectedDate = new Date(timestamp)
    const today = new Date()
    const minDate = new Date()
    minDate.setFullYear(today.getFullYear() - 18)

    // Disable future dates and dates where user would be under 18
    return timestamp > Date.now() || selectedDate > minDate
}

const getRandomImage = () => {
    const randomIndex = Math.floor(Math.random() * images.length)
    randomImage.value = images[randomIndex]
}

const nextStep = () => {
    if (currentStep.value < 3) {
        currentStep.value++
    }
}

const prevStep = () => {
    if (currentStep.value > 0) {
        currentStep.value--
    }
}

const calculateAge = (timestamp) => {
    if (!timestamp) {
        age.value = ''
        return
    }
    const birthDate = new Date(timestamp)
    const today = new Date()
    let calculatedAge = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--
    }

    age.value = calculatedAge.toString()

    // Update the form validation
    personalFormRef.value?.validate()
}

const handleCountryChange = (country) => {
    personalForm.value.state = null
    // Simulate state options based on country
    stateOptions.value = [
        { label: `${country.charAt(0).toUpperCase() + country.slice(1)} State 1`, value: `${country}-state-1` },
        { label: `${country.charAt(0).toUpperCase() + country.slice(1)} State 2`, value: `${country}-state-2` },
        { label: `${country.charAt(0).toUpperCase() + country.slice(1)} State 3`, value: `${country}-state-3` }
    ]
}

const validatePasswordStrength = () => {
    const password = securityForm.value.password
    hasLowercase.value = /[a-z]/.test(password)
    hasUppercase.value = /[A-Z]/.test(password)
    hasNumeric.value = /[0-9]/.test(password)
    hasSpecialChar.value = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    isMinLength.value = password.length >= 8
}

const trimPhoneNumber = () => {
    securityForm.value.phoneNumber = securityForm.value.phoneNumber.replace(/\s/g, '')
}

const validatePersonalInfo = async () => {
    try {
        await personalFormRef.value?.validate()
        nextStep()
    } catch (errors) {
        message.error('Please fix the validation errors')
    }
}

const validateSecurity = async () => {
    try {
        await securityFormRef.value?.validate()
        nextStep()
    } catch (errors) {
        message.error('Please fix the validation errors')
    }
}

const goToLogin = () => {
    router.push({ name: 'Login' })
}

// Image upload handlers
const handlePreview = (file) => {
    const { url } = file
    previewImageUrl.value = url
    showModal.value = true
}

const handleRemove = (data) => {
    const { file, fileList } = data
    hasProfilePicture.value = false
    personalForm.value.profilePicture = null
    previewFileList.value = fileList
    console.log('Profile picture removed via remove button')
    message.info('Profile image removed')

    // Trigger validation
    personalFormRef.value?.validate()
}

const handleUploadChange = (data) => {
    console.log('Upload change data:', data)

    const { file, fileList } = data

    if (file.status === 'finished' || file.file) {
        hasProfilePicture.value = true
        // Create object URL for local file preview
        const fileUrl = URL.createObjectURL(file.file || file)
        personalForm.value.profilePicture = fileUrl
        console.log('Profile picture set to:', personalForm.value.profilePicture)
        message.success('Profile image uploaded successfully')

        previewFileList.value = fileList
        personalFormRef.value?.validate()
    } else if (file.status === 'removed') {
        hasProfilePicture.value = false
        personalForm.value.profilePicture = null
        previewFileList.value = fileList
        console.log('Profile picture removed')
        personalFormRef.value?.validate()
    }
}
// Initialize
onMounted(() => {
    getRandomImage()
})
</script>
