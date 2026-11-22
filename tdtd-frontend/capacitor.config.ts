import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tdtd.teacher',
  appName: "Teacher's Dilemma Today",
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
