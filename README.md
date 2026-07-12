# Bridgr

A clean, minimal cross-chain crypto bridge interface built with TanStack Start, RainbowKit, wagmi, and Chainlink CCIP. Move ETH between Sepolia and Base Sepolia testnets in seconds.

![Preview](https://id-preview--4d9c8042-ff2d-4f0a-b3ab-da8a1c83bf5c.lovable.app)

## Features

- **One-click bridging** between Sepolia ↔ Base Sepolia
- **Wallet connection** via RainbowKit (MetaMask, WalletConnect, Coinbase Wallet, etc.)
- **Real-time estimates** — see destination amount, fees, and route before confirming
- **CCIP tracking** — after confirmation, track your message on [ccip.chain.link](https://ccip.chain.link)
- **Dark / light mode** toggle
- **Responsive design** — works on desktop and mobile

## Tech Stack

- [TanStack Start](https://tanstack.com/start) — full-stack React framework
- [TanStack Query](https://tanstack.com/query) — server state management
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [shadcn/ui](https://ui.shadcn.com) — accessible UI components
- [RainbowKit](https://rainbowkit.com) + [wagmi](https://wagmi.sh) + [viem](https://viem.sh) — Ethereum interactions
- [Chainlink CCIP](https://chain.link/cross-chain) — cross-chain messaging

## Supported Chains

| Chain | Type | Contract |
|-------|------|----------|
| Sepolia | Testnet | `0x730Db6e61E194951d8c4a43c2a9FF22b1fD2D36d` |
| Base Sepolia | Testnet | `0xE3Be36F99d9a1F253cBF669a72a12948902aF66C` |

## Getting Started

```bash
# Install dependencies
bun install

# Start the dev server
bun run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

## Building for Production

```bash
bun run build
```

## Project Structure

```text
src/
  components/
    BridgeCard.tsx       # Main bridge UI + transaction flow
    ThemeProvider.tsx    # Dark/light mode provider
    ThemeToggle.tsx      # Theme switch button
  lib/
    bridge.ts            # CCIP ABI, contract addresses, messageId decoder
  routes/
    index.tsx            # Landing page with hero + bridge card
    __root.tsx           # Root layout and providers
```

## Notes

- This app is configured for **testnet only**. Make sure your wallet is connected to Sepolia or Base Sepolia.
- Bridge fees are estimated at 0.15% for display purposes.
- The message ID emitted by the `Sent` event is used to track the CCIP message status.

## License

MIT
