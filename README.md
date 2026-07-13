# Bridgr (BridgeX)

A clean, minimal cross-chain crypto bridge interface built with TanStack Start, RainbowKit, wagmi, and Chainlink CCIP. Move native ETH between Ethereum Sepolia and Base Sepolia testnets in seconds.

![Preview](https://id-preview--4d9c8042-ff2d-4f0a-b3ab-da8a1c83bf5c.lovable.app)

## Features

- **One-click bridging** between Sepolia ↔ Base Sepolia
- **Native ETH transfers** using a lock-and-release pool model — no wrapped tokens
- **Wallet connection** via RainbowKit (MetaMask, WalletConnect, Coinbase Wallet, etc.)
- **Real-time estimates** — see destination amount, fees, and route before confirming
- **Live ETH price** fetched from CoinGecko for accurate USD estimates
- **Destination pool validation** — checks that the destination contract has enough ETH before you submit
- **CCIP tracking** — after confirmation, track your message on [ccip.chain.link](https://ccip.chain.link)
- **Dark / light mode** toggle
- **Responsive design** — works on desktop and mobile

---

## Architecture

### System overview

Bridgr is a **testnet-native ETH bridge** built directly on [Chainlink CCIP](https://chain.link/cross-chain). It does not wrap ETH, mint synthetic tokens, or rely on a third-party aggregator. Instead, it uses a pair of custom Solidity contracts that communicate via CCIP messages to lock ETH on the source chain and release ETH from a pre-funded pool on the destination chain.

```text
┌─────────────────────────────────────────────────────────────────────┐
│                              User Browser                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │   Bridge UI  │  │  RainbowKit  │  │  wagmi / viem interactions  │  │
│  │  BridgeCard  │  │   wallet     │  │  (balance, write, receipt)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┬──────────────┘  │
└───────┬─┴─────────────────┴─────────────────────────┴────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Blockchain (testnets)                       │
│                                                                     │
│   Ethereum Sepolia                              Base Sepolia        │
│   ┌──────────────────────┐                    ┌────────────────────┐  │
│   │  Bridgr contract     │                    │  Bridgr contract   │  │
│   │  0x730Db6e…D2D36d    │   CCIP message    │  0xE3Be36F…02aF66C │  │
│   │                      │ ────────────────> │                    │  │
│   │  • locks sender ETH  │   messageId       │  • releases ETH    │  │
│   │  • calls router.ccipSend()              │    to receiver     │  │
│   │  • emits Sent event  │                   │                    │  │
│   └──────────────────────┘                   └────────────────────┘  │
│            ▲                                          ▲               │
│            └────────── Chainlink CCIP DON ──────────┘               │
│                     (oracle verification + delivery)                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Lock-and-release flow

1. **Initiate** — The user calls `bridgeETH(destinationChainSelector, receiver)` on the source-chain contract, sending native ETH as `msg.value`.
2. **Lock** — The source contract locks the ETH inside its own pool.
3. **Send CCIP message** — The contract builds a CCIP message containing the receiver and amount, then calls `router.ccipSend(destinationChainSelector, message)`.
4. **Emit `Sent` event** — The contract emits `Sent(messageId, destinationChainSelector, receiver, amount)`. The frontend captures this `messageId` from the transaction receipt to provide a tracking link.
5. **Verify & deliver** — Chainlink's decentralized oracle network verifies source-chain finality, risk management rules, and delivers the message to the destination contract.
6. **Release** — The destination contract validates the sender (via `trustedRemote` allowlist) and releases the equivalent ETH from its pool to the receiver.

### Smart contract architecture

Each chain runs an identical Bridgr contract with three responsibilities:

| Responsibility | Details |
|---------------|---------|
| **Lock / release** | Holds a pre-funded ETH pool. Locks ETH on the source side and releases ETH on the destination side. |
| **CCIP messaging** | Calls Chainlink's `Router.ccipSend()` to emit cross-chain messages and implements `ccipReceive()` to handle incoming messages. |
| **Access control** | Only accepts incoming messages from the paired contract address on the allow-listed chain (`trustedRemote`), preventing spoofed messages from draining the pool. |

Because both sides use **lock-and-release**, the destination pool must always hold enough ETH to cover the requested amount. The frontend enforces this before submission.

### Frontend architecture

```text
src/
├── routes/
│   ├── __root.tsx          # Root layout, providers, theme
│   ├── index.tsx           # Landing page with hero + BridgeCard
│   └── docs.tsx            # BridgeX documentation page
├── components/
│   ├── BridgeCard.tsx      # Main bridge UI + transaction flow
│   ├── Header.tsx          # Shared navigation header
│   ├── ThemeProvider.tsx   # Dark/light mode provider
│   ├── ThemeToggle.tsx     # Theme switch button
│   └── Web3Provider.tsx    # RainbowKit + wagmi configuration
├── lib/
│   ├── bridge.ts           # CCIP ABI, contract addresses, chain selectors, messageId decoder
│   ├── wagmi.ts            # Wallet connector / chain config
│   └── utils.ts            # Tailwind / cn helpers
└── router.tsx              # TanStack Router setup
```

### Security model

| Layer | Protection |
|-------|-----------|
| **Contract allowlist** | Each contract only accepts `ccipReceive` calls from the verified counterpart contract on the paired chain. |
| **Pool validation** | The UI fetches the destination contract's ETH balance and blocks the transaction if it cannot cover the requested amount. |
| **Native ETH only** | No ERC-20 approvals or token allowances are required, reducing attack surface. |
| **Testnet scope** | Contracts are deployed only on Sepolia and Base Sepolia; no mainnet or real-value assets are involved. |

### Data flow in the UI

1. **Wallet state** — `useAccount` (address, connection, chainId) and `useBalance` (user balance on source chain).
2. **Destination pool state** — `useBalance` reads the destination contract's ETH balance every 15 seconds.
3. **Price feed** — `useQuery` fetches the live ETH/USD price from CoinGecko every 60 seconds.
4. **Transaction lifecycle** — `useWriteContract` submits the bridge, `useWaitForTransactionReceipt` waits for confirmation, and `getMessageIdFromReceipt` decodes the `Sent` event.
5. **Tracking** — The decoded `messageId` is used to build a direct link to the [CCIP Explorer](https://ccip.chain.link).

---

## Tech Stack

- [TanStack Start](https://tanstack.com/start) — full-stack React framework
- [TanStack Query](https://tanstack.com/query) — server state management
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [shadcn/ui](https://ui.shadcn.com) — accessible UI components
- [RainbowKit](https://rainbowkit.com) + [wagmi](https://wagmi.sh) + [viem](https://viem.sh) — Ethereum interactions
- [Chainlink CCIP](https://chain.link/cross-chain) — cross-chain messaging
- [CoinGecko API](https://www.coingecko.com/en/api) — live ETH/USD price

---

## Supported Chains

| Chain | Type | Chain Selector | Contract |
|-------|------|----------------|----------|
| Sepolia | Testnet | `16015286601757825753` | `0x730Db6e61E194951d8c4a43c2a9FF22b1fD2D36d` |
| Base Sepolia | Testnet | `10344971235874465080` | `0xE3Be36F99d9a1F253cBF669a72a12948902aF66C` |

---

## Project Structure

```text
src/
  components/
    BridgeCard.tsx       # Main bridge UI + transaction flow
    Header.tsx           # Shared header with nav + wallet + theme
    ThemeProvider.tsx    # Dark/light mode provider
    ThemeToggle.tsx      # Theme switch button
    Web3Provider.tsx     # RainbowKit + wagmi configuration
  lib/
    bridge.ts            # CCIP ABI, contract addresses, messageId decoder
    wagmi.ts             # Wallet connector config
  routes/
    index.tsx            # Landing page with hero + bridge card
    docs.tsx             # BridgeX documentation
    __root.tsx           # Root layout and providers
```

---

## Getting Started

```bash
# Install dependencies
bun install

# Start the dev server
bun run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## Building for Production

```bash
bun run build
```

---

## Notes

- This app is configured for **testnet only**. Make sure your wallet is connected to Sepolia or Base Sepolia.
- Bridge fees are estimated at 0.15% for display purposes; CCIP LINK fees are currently absorbed by the platform.
- The `messageId` emitted by the `Sent` event is used to track the CCIP message status on [ccip.chain.link](https://ccip.chain.link).
- Destination pool liquidity is checked before every bridge to prevent stuck transactions.

---

## License

MIT
