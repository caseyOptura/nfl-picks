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
  },
  runtimeConfig: {
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    inviteFromEmail: process.env.INVITE_FROM_EMAIL ?? '',
    public: {
      siteUrl: process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000',
    },
  },
})
