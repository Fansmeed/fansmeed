import { config } from '@vue/test-utils'

config.global.mocks = {
  // Add any global mocks here if needed
}

// Silence Vue warnings in test output unless needed
process.env.VUE_APP_SILENCE = 'true'
