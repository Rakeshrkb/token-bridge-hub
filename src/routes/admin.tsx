import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, fallback, formatUnits } from "viem";
import { sepolia, baseSepolia, polygonAmoy, bscTestnet } from "wagmi/chains";
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";

import { Header } from "@/components/Header";
import {
  BRIDGE_CHAINS,
  ERC20_ABI,
  LINK_TOKENS,
  LINK_LOW_BALANCE_THRESHOLD,
} from "@/lib/bridge";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "BridgeX Admin — LINK pool balances" },
      {
        name: "description",
        content:
          "Monitor the LINK fee balance of every BridgeX contract across Sepolia, Base Sepolia, Polygon Amoy and BSC Testnet, and see when a top-up is needed.",
      },
      { property: "og:title", content: "BridgeX Admin — LINK pool balances" },
      {
        property: "og:description",
        content: "Monitor LINK fee balances of BridgeX contracts and get top-up alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const CHAINS = [
  { chain: sepolia, name: "Ethereum Sepolia", explorer: "https://sepolia.etherscan.io/address/" },
  { chain: baseSepolia, name: "Base Sepolia", explorer: "https://sepolia.basescan.org/address/" },
  { chain: polygonAmoy, name: "Polygon Amoy", explorer: "https://amoy.polygonscan.com/address/" },
  { chain: bscTestnet, name: "BSC Testnet", explorer: "https://testnet.bscscan.com/address/" },
];

type LinkRow = {
  chainId: number;
  name: string;
  bridge: `0x${string}`;
  link: `0x${string}`;
  explorer: string;
  balance: number;
  error?: string;
};

async function fetchLinkBalances(): Promise<LinkRow[]> {
  return Promise.all(
    CHAINS.map(async ({ chain, name, explorer }) => {
      const bridge = BRIDGE_CHAINS[chain.id]?.contract;
      const link = LINK_TOKENS[chain.id];
      const row: LinkRow = {
        chainId: chain.id,
        name,
        bridge,
        link,
        explorer,
        balance: 0,
      };
      try {
        const client = createPublicClient({ chain, transport: http() });
        const raw = (await client.readContract({
          address: link,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [bridge],
        })) as bigint;
        row.balance = Number(formatUnits(raw, 18));
      } catch (e) {
        row.error = e instanceof Error ? e.message : "Failed to read balance";
      }
      return row;
    }),
  );
}

function AdminPage() {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin-link-balances"],
    queryFn: fetchLinkBalances,
    refetchInterval: 60_000,
  });

  const lowRows = (data ?? []).filter((r) => !r.error && r.balance < LINK_LOW_BALANCE_THRESHOLD);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
      </div>

      <Header />

      <main className="mx-auto max-w-4xl px-6 pb-20 pt-6 md:pt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              LINK fee balance held by each BridgeX contract. Top up when a chain drops below{" "}
              {LINK_LOW_BALANCE_THRESHOLD} LINK.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-accent"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {lowRows.length > 0 && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-foreground">Top up required</p>
              <p className="mt-1 text-muted-foreground">
                {lowRows.map((r) => `${r.name} (${r.balance.toFixed(4)} LINK)`).join(", ")} —
                CCIP messages from these chains may fail until refilled.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Chain</th>
                <th className="px-4 py-3 font-medium">Bridge contract</th>
                <th className="px-4 py-3 text-right font-medium">LINK balance</th>
                <th className="px-4 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {!data &&
                CHAINS.map((c) => (
                  <tr key={c.chain.id} className="border-t border-border">
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">Loading…</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                  </tr>
                ))}
              {data?.map((row) => {
                const low = !row.error && row.balance < LINK_LOW_BALANCE_THRESHOLD;
                return (
                  <tr key={row.chainId} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`${row.explorer}${row.bridge}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition hover:text-foreground"
                      >
                        {row.bridge.slice(0, 6)}…{row.bridge.slice(-4)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {row.error ? "—" : `${row.balance.toFixed(4)} LINK`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.error ? (
                        <span className="text-xs text-muted-foreground">RPC error</span>
                      ) : low ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" /> Top up
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Balances refresh automatically every 60 seconds
        </p>
      </main>
    </div>
  );
}
