# CoinLens v0.1

Local-first, read-only Solana research dashboard. Requires Node.js 20 or newer; no package installation required.

```sh
npm start
```

Open http://localhost:3000. Paste a Solana mint address to retrieve a timestamped evidence report. Reports are saved in the local data directory (ignored by Git). The Vamp check searches indexed DEX pairs by name or ticker: it is not yet a comprehensive historical copy detector.

Optional: set SOLANA_RPC_URL to your own dedicated RPC URL on the server. The public Solana endpoint may not serve largest-token-account queries. Never commit provider credentials. Use a fresh key and protect this value.

```sh
npm test
```

Market data uses the documented DEX Screener API: https://docs.dexscreener.com/api/reference. On-chain observations use documented Solana JSON RPC: https://solana.com/docs/rpc/http.

This is an early implementation, not a trading recommendation engine. No automated transactions, private keys, project safety claims, real-money rewards, AI verification, or comprehensive holder attribution. The server binds to localhost only; authentication and production hardening are required before exposing it.
