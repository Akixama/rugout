import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const PUBLIC_SOLANA_RPC = 'https://api.mainnet.solana.com'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rpcTarget = env.SOLANA_RPC_URL || PUBLIC_SOLANA_RPC

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/solana-rpc': {
          target: rpcTarget,
          changeOrigin: true,
          secure: true,
          rewrite: () => '/',
        },
      },
    },
  }
})
