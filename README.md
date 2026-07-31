# Rugout

Paste a Solana token mint address. Get an instant read on mint authority, freeze authority, and holder concentration — before you ape in.

Built for Solana's specific rug vectors: mint authority abuse, freeze authority backdoors, and top-holder concentration.

## Live checks

- **Mint authority** — flagged if not revoked (creator can mint unlimited new supply)
- **Freeze authority** — flagged if not revoked (creator can freeze your wallet's tokens)
- **Holder concentration** — flags if top 10 wallets hold >20% (warning) or >50% (danger) of supply
- **Top-holder breakdown** — resolves token accounts to wallet owners and shows each wallet's supply percentage
- **Wallet behaviour signals** — checks first recorded token entry, pre-entry SOL, same-slot entries, and possible early-entry/sniper activity
- **Liquidity-aware ranking** — excludes detected Pump, PumpSwap, Raydium, Meteora, and Orca program vaults before ranking holders
- **Execution venue** — identifies the onchain program behind the first recorded acquisition, including supported Pump, Raydium, Meteora, Orca, and Jupiter routes

## Stack

- React + Vite
- Solana JSON-RPC (`getAccountInfo`, `getTokenLargestAccounts`)
- A small same-origin RPC gateway for reliable browser requests
- No database

## Run locally

```
npm install
npm run dev
```

Vite proxies `/api/solana-rpc` to Solana while developing, avoiding the browser
403 returned by shared RPC endpoints.

## Netlify deployment

The included `netlify.toml` automatically builds the Vite app and routes scan
requests through `netlify/functions/solana-rpc.mjs`.

The default public RPC is enough for development and small demos. For a reliable
production deployment, add a server-side Netlify environment variable:

```
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

Do not name it `VITE_SOLANA_RPC_URL`; variables prefixed with `VITE_` are exposed
to the browser.

## Known limitations

- LP lock status is not yet checked (requires parsing Raydium/Meteora pool accounts — planned for v2)
- The default public RPC can still rate-limit server requests; configure `SOLANA_RPC_URL` for production reliability
- Wallet-history signals use Helius `getTransactionsForAddress`. They are heuristics and appear as unknown when history is incomplete or the RPC plan does not support the method
- “Possible sniper” means a recorded acquisition occurred within two minutes of mint creation; it is a signal for investigation, not proof of intent
- Frontend attribution is only shown when it is provable onchain. A terminal such as Axiom or Fomo may route through another venue, so Rugout reports the actual execution program rather than guessing the interface
- Creator wallet history / prior rug detection not yet implemented

## License

Apache 2.0
