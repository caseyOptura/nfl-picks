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
    preset: 'cloudflare-pages',
    // Shared cache for the ESPN schedule. Nitro's default cache is in-memory,
    // which on Cloudflare is per isolate, so most requests landed on a cold one
    // and re-fetched ~7 MB from ESPN — the cause of the 1102 resource-limit
    // errors. KV is shared across isolates. `ESPN_CACHE` is a KV namespace bound
    // to the Pages project; if the binding is missing, Nitro logs cache errors
    // and serves the route uncached rather than failing.
    storage: {
      'espn-cache': { driver: 'cloudflare-kv-binding', binding: 'ESPN_CACHE' },
      // Per-isolate cache for the smaller per-team / per-player ESPN routes.
      // Kept out of KV: hundreds of keys would blow the free tier's 1,000
      // writes a day.
      'espn-memory': { driver: 'memory' },
    },
    devStorage: {
      'espn-cache': { driver: 'memory' },
      'espn-memory': { driver: 'memory' },
    },
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
