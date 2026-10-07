import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = env.VITE_SUPABASE_URL || ''
  const anonKey = env.VITE_SUPABASE_ANON_KEY || ''
  const edgeFnTarget = `${supabaseUrl}/functions/v1/shop-api`

  return {
    plugins: [react()],
    server: {
      port: 5175,
      host: true,
      proxy: {
        '/api': {
          target: edgeFnTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          // Inject the Supabase anon key server-side — never exposed to the browser
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (anonKey) {
                proxyReq.setHeader('apikey', anonKey)
              }
            })
          },
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-icons': ['lucide-react'],
            'vendor-supabase': ['@supabase/supabase-js'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  }
})
