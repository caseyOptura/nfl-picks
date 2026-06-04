// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxtjs/supabase'],
  supabase: {
    redirect: false,
    useSsrCookies: false,
  },
  nitro: {
    preset: 'cloudflare-pages'
  },
  routeRules: {
    '/': { redirect: '/schedule' }
  }
})
