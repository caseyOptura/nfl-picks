// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxtjs/supabase', '@vueuse/nuxt', 'vue-sonner/nuxt'],
  supabase: {
    redirect: false,
    useSsrCookies: false,
  },
  nitro: {
    preset: 'cloudflare-pages'
  },
  app: {
    head: {
      meta: [{ name: 'theme-color', content: '#0a0a0a' }],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      ],
    },
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
      // Web Push application server key (public half of the VAPID pair).
      vapidPublicKey: process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    },
  },
})
