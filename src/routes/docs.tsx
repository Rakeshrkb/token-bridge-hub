import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "BridgeX Documentation" },
      {
        name: "description",
        content:
          "Learn how BridgeX uses Chainlink CCIP to bridge native ETH between Ethereum Sepolia and Base Sepolia testnets.",
      },
      { property: "og:title", content: "BridgeX Documentation" },
      {
        property: "og:description",
        content:
          "Learn how BridgeX uses Chainlink CCIP to bridge native ETH between Ethereum Sepolia and Base Sepolia testnets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-[#627EEA]/15 blur-[140px]" />
        <div className="absolute bottom-20 left-0 h-[400px] w-[400px] rounded-full bg-[#0052FF]/15 blur-[140px]" />
      </div>

      <Header />

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-6 md:pt-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bridge
        </Link>

        <h1 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
          BridgeX Documentation
        </h1>

        <div className="mt-10 space-y-12">
          <section>
            <h2 className="text-xl font-semibold text-foreground">What is BridgeX</h2>
            <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              BridgeX is a native ETH bridge between Ethereum Sepolia and Base Sepolia testnets, built
              directly on Chainlink's Cross-Chain Interoperability Protocol (CCIP). Unlike
              token-wrapping bridges, BridgeX moves native ETH using a lock-and-release architecture
              with custom Solidity smart contracts — no third-party bridge aggregator or router
              service in the middle.
            </p>
            <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              This is a testnet project built to explore production-grade cross-chain wallet
              infrastructure, key custody patterns, and CCIP messaging mechanics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">How it works</h2>
            <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              BridgeX uses a lock-and-release model rather than mint-and-burn:
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              <li>
                You send ETH to the BridgeX contract on the source chain (e.g. Sepolia). The contract
                locks that ETH in its own pool.
              </li>
              <li>
                The contract sends a CCIP message to the destination chain's BridgeX contract via
                Chainlink's Router, containing the recipient address and amount.
              </li>
              <li>
                Chainlink's decentralized oracle network (DON) verifies and delivers the message to the
                destination contract.
              </li>
              <li>
                The destination contract releases the equivalent ETH from its own pre-funded pool
                directly to the recipient.
              </li>
            </ol>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border/60 bg-secondary/30 p-5 font-mono text-xs text-muted-foreground md:text-sm">
              <pre className="whitespace-pre">
{`Source Chain                     Destination Chain
┌─────────────────┐              ┌─────────────────┐
│  BridgeX pool    │  CCIP msg    │  BridgeX pool    │
│  locks ETH   ────┼─────────────>│  releases ETH    │
└─────────────────┘              └─────────────────┘`}
              </pre>
            </div>

            <p className="mt-4 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              Both contracts maintain independent, pre-funded ETH pools. Each contract only trusts
              messages from a verified counterpart contract address on the paired chain
              (allow-listed via trustedRemote), preventing spoofed cross-chain messages from
              draining funds.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Supported networks</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Chain</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Chain Selector</th>
                    <th className="px-4 py-3 font-medium">Contract</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">Ethereum Sepolia</td>
                    <td className="px-4 py-3 text-muted-foreground">Source / Destination</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">16015286601757825753</td>
                    <td className="px-4 py-3 font-mono text-primary">
                      <a
                        href="https://sepolia.etherscan.io/address/0x4133727299A02942Ca9a3e18fD11D95DCa3dAdD3"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        0x41337272…AdD3
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">Base Sepolia</td>
                    <td className="px-4 py-3 text-muted-foreground">Source / Destination</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">10344971235874465080</td>
                    <td className="px-4 py-3 font-mono text-primary">
                      <a
                        href="https://sepolia.basescan.org/address/0x3e4Fe7d25dE550bEacFC185a7fef83270717eEaA"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        0x3e4Fe7d2…eEaA
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Both contracts are verified on-chain — source code is publicly viewable at the links
              above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Timing expectations</h2>
            <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              Bridging is not instant. CCIP messages go through source-chain finality, commitment,
              risk-management verification, and destination execution. On testnet, this typically takes
              5–20 minutes, depending on network conditions. After you submit a bridge transaction,
              BridgeX gives you a direct link to track live status on Chainlink's CCIP Explorer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Liquidity model</h2>
            <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              Because BridgeX uses pre-funded pools rather than mint/burn, the destination chain's pool
              must hold enough ETH to cover your bridge amount. BridgeX checks destination pool
              liquidity before allowing a bridge transaction, and will block the transaction upfront if
              the pool can't cover it — rather than letting it fail after your funds are already locked
              on the source side.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Known limitations</h2>
            <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              This is a testnet project, not audited, and not intended for real funds:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              <li>
                <strong className="text-foreground">Testnet only</strong> — Sepolia and Base Sepolia
                ETH have no real value.
              </li>
              <li>
                <strong className="text-foreground">Pool-based liquidity</strong> — unlike mint/burn
                bridges, available liquidity depends on manual pool funding and can be temporarily
                exhausted.
              </li>
              <li>
                <strong className="text-foreground">No protocol fee</strong> — CCIP messaging fees
                (paid in LINK) are currently absorbed by the platform, not charged to the sender.
              </li>
              <li>
                <strong className="text-foreground">No multisig/timelock on admin functions</strong>{" "}
                — pool top-ups and trusted-remote configuration are currently single-owner controlled,
                which is fine for a testnet demo but would need to change for any production use.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">FAQ</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                <h3 className="font-medium text-foreground">Why is my transaction taking a while?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  CCIP finality on testnet typically takes 5–20 minutes. Track live progress via the
                  CCIP Explorer link shown after you submit.
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                <h3 className="font-medium text-foreground">
                  What happens if the destination pool doesn't have enough ETH?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  BridgeX checks this before allowing you to submit, so this shouldn't happen in normal
                  use. If it does, the transaction is blocked before any funds move.
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                <h3 className="font-medium text-foreground">Is this safe to use with real money?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No — this is a testnet-only project for learning and demonstration purposes.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Links</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <Github className="h-4 w-4" />
                GitHub Repository
              </a>
              <a
                href="https://ccip.chain.link"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <ExternalLink className="h-4 w-4" />
                Chainlink CCIP Explorer
              </a>
              <a
                href="https://docs.chain.link/ccip"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <ExternalLink className="h-4 w-4" />
                Chainlink CCIP Documentation
              </a>
            </div>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">Owner</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://github.com/Rakeshrkb"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <Github className="h-4 w-4" />
                Rakesh GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/rakeshkumarbarik"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <ExternalLink className="h-4 w-4" />
                Rakesh LinkedIn
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
