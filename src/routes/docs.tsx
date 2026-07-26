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
          "How BridgeX uses Chainlink CCIP to bridge native ETH and the CROSS token across Sepolia, Base Sepolia, Polygon Amoy and BSC Testnet.",
      },
      { property: "og:title", content: "BridgeX Documentation" },
      {
        property: "og:description",
        content:
          "How BridgeX uses Chainlink CCIP to bridge native ETH and the CROSS token across Sepolia, Base Sepolia, Polygon Amoy and BSC Testnet.",
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
              BridgeX is a cross-chain bridge built directly on Chainlink's Cross-Chain
              Interoperability Protocol (CCIP). It supports native ETH as well as the CROSS ERC20
              token across four testnets: Ethereum Sepolia, Base Sepolia, Polygon Amoy and BNB Smart
              Chain Testnet — using custom Solidity contracts, with no third-party bridge aggregator
              in the middle.
            </p>
            <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              This is a testnet project built to explore production-grade cross-chain wallet
              infrastructure, key custody patterns, and CCIP messaging mechanics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Bridging models</h2>
            <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              BridgeX uses two different mechanisms depending on the asset:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              <li>
                <strong className="text-foreground">Native ETH — lock &amp; release.</strong> ETH is
                locked in the BridgeX pool on the source chain and an equivalent amount is released
                from the pre-funded pool on the destination chain.
              </li>
              <li>
                <strong className="text-foreground">CROSS (ERC20) — burn &amp; mint.</strong> CROSS
                is burned by the token pool on the source chain and freshly minted to the receiver on
                the destination chain, so total supply stays constant across all chains and there is
                no pool liquidity requirement.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">How it works</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              <li>
                You call <code className="font-mono text-foreground">bridge(destinationChainSelector, receiver, token, amount)</code>{" "}
                on the BridgeX contract. For ETH the token address is the zero address and the value
                is sent as <code className="font-mono text-foreground">msg.value</code>; for CROSS you
                first approve the bridge contract, then the amount is pulled and burned.
              </li>
              <li>
                The contract sends a CCIP message to the destination chain's BridgeX contract via
                Chainlink's Router, containing the recipient address, token and amount.
              </li>
              <li>
                Chainlink's decentralized oracle network (DON) verifies and delivers the message to
                the destination contract.
              </li>
              <li>
                The destination contract releases ETH from its pool, or mints CROSS to the recipient.
              </li>
            </ol>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border/60 bg-secondary/30 p-5 font-mono text-xs text-muted-foreground md:text-sm">
              <pre className="whitespace-pre">
{`Source Chain                     Destination Chain
┌─────────────────┐              ┌─────────────────┐
│ lock ETH / burn  │  CCIP msg    │ release ETH /    │
│ CROSS        ────┼─────────────>│ mint CROSS       │
└─────────────────┘              └─────────────────┘`}
              </pre>
            </div>

            <p className="mt-4 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              Each contract only trusts messages from a verified counterpart contract address on the
              paired chain (allow-listed via trustedRemote), preventing spoofed cross-chain messages
              from draining funds.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Supported networks</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Chain</th>
                    <th className="px-4 py-3 font-medium">Chain ID</th>
                    <th className="px-4 py-3 font-medium">Chain Selector</th>
                    <th className="px-4 py-3 font-medium">Bridge Contract</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">Ethereum Sepolia</td>
                    <td className="px-4 py-3 text-muted-foreground">11155111</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">16015286601757825753</td>
                    <td className="px-4 py-3 font-mono text-primary">
                      <a
                        href="https://sepolia.etherscan.io/address/0x4133727299A02942Ca9a3e18fD11D95DCa3dAdD3"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        0x4133727299A02942Ca9a3e18fD11D95DCa3dAdD3
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">Base Sepolia</td>
                    <td className="px-4 py-3 text-muted-foreground">84532</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">10344971235874465080</td>
                    <td className="px-4 py-3 font-mono text-primary">
                      <a
                        href="https://sepolia.basescan.org/address/0x3e4Fe7d25dE550bEacFC185a7fef83270717eEaA"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        0x3e4Fe7d25dE550bEacFC185a7fef83270717eEaA
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">Polygon Amoy</td>
                    <td className="px-4 py-3 text-muted-foreground">80002</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">16281711391670634445</td>
                    <td className="px-4 py-3 font-mono text-primary">
                      <a
                        href="https://amoy.polygonscan.com/address/0xE3Be36F99d9a1F253cBF669a72a12948902aF66C"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        0xE3Be36F99d9a1F253cBF669a72a12948902aF66C
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">BNB Smart Chain Testnet</td>
                    <td className="px-4 py-3 text-muted-foreground">97</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">16281711391670634445</td>
                    <td className="px-4 py-3 font-mono text-primary">
                      <a
                        href="https://testnet.bscscan.com/address/0xE3Be36F99d9a1F253cBF669a72a12948902aF66C"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        0xE3Be36F99d9a1F253cBF669a72a12948902aF66C
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="mt-8 text-base font-semibold text-foreground">
              CROSS token &amp; pool addresses
            </h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Chain</th>
                    <th className="px-4 py-3 font-medium">CROSS Token</th>
                    <th className="px-4 py-3 font-medium">Burn &amp; Mint Pool</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">Ethereum Sepolia</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      0x334aE912E59ec7cAe23A12d631cFb6F4889dB80F
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      0x25e9022beBac9001D1Cba2744cfdA068a78F75e9
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">Base Sepolia</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      0x47b341EB45FC6E69Eee17bD6D85d82CC56ad6624
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      0x2Cf54C4a8f5B442Fdfc455Be329B4B74580cb336
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">Polygon Amoy</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      0x89bb27051790D2f51Ba6b7153447c9C7d3bBB6DF
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">—</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">BNB Smart Chain Testnet</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      0x2587b881C9F815035df67883A51a538BDe558c68
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      0x2587b881C9F815035df67883A51a538BDe558c68
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Bridge contracts are verified on-chain — source code is publicly viewable at the links
              above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Transaction history</h2>
            <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              The Activity tab does not scan raw chain logs. BridgeX indexes the{" "}
              <code className="font-mono text-foreground">Sent</code> event emitted by the bridge
              contracts with a subgraph on The Graph, and the frontend queries it over GraphQL,
              filtered by your connected wallet address:
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border/60 bg-secondary/30 p-5 font-mono text-xs text-muted-foreground md:text-sm">
              <pre className="whitespace-pre">
{`{
  sents(first: 10, orderBy: blockNumber, orderDirection: desc,
        where: { receiver: "0x…" }) {
    messageId
    destinationChainSelector
    receiver
    token
    amount
    blockNumber
    transactionHash
  }
}`}
              </pre>
            </div>
            <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              Each row resolves the destination chain from the CCIP selector and the token symbol
              from the token address, and links to the CCIP Explorer via the{" "}
              <code className="font-mono text-foreground">messageId</code>.
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
              Native ETH bridging relies on pre-funded pools, so the destination chain's pool must
              hold enough ETH to cover your amount. BridgeX checks destination pool liquidity before
              allowing the transaction and blocks it upfront if the pool can't cover it — rather than
              letting it fail after your funds are already locked on the source side.
            </p>
            <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              CROSS has no such constraint: it is burned on the source chain and minted on the
              destination chain, so no pre-funded liquidity is required.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">Known limitations</h2>
            <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
              This is a testnet project, not audited, and not intended for real funds:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              <li>
                <strong className="text-foreground">Testnet only</strong> — Sepolia, Base Sepolia,
                Polygon Amoy and BSC Testnet assets have no real value.
              </li>
              <li>
                <strong className="text-foreground">Pool-based ETH liquidity</strong> — native ETH
                liquidity depends on manual pool funding and can be temporarily exhausted.
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
