import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ChevronDown, ExternalLink, Link2, Settings2, Zap } from "lucide-react";
import { parseEther } from "viem";
import {
  useAccount,
  useBalance,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { sepolia, baseSepolia } from "wagmi/chains";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BRIDGE_ABI, BRIDGE_CHAINS, getMessageIdFromReceipt, isBridgeSupported } from "@/lib/bridge";

async function fetchEthPrice(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
  );
  if (!res.ok) throw new Error("Failed to fetch ETH price");
  const data = await res.json();
  return data.ethereum.usd as number;
}

type ChainMeta = {
  id: number;
  name: string;
  short: string;
  color: string;
  testnet?: boolean;
  logo?: string;
};

const CHAINS: ChainMeta[] = [
  { id: sepolia.id, name: "Sepolia", short: "SEP", color: "#627EEA", testnet: true, logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" },
  { id: baseSepolia.id, name: "Base Sepolia", short: "BASE", color: "#0052FF", testnet: true, logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png" },
];

function ChainBadge({ chain, size = 32 }: { chain: ChainMeta; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0 overflow-hidden bg-white dark:bg-neutral-900 border border-border/50"
      style={{
        width: size,
        height: size,
      }}
    >
      <img
        src={chain.logo}
        alt={chain.name}
        onError={(e) => (e.currentTarget.style.display = "none")}
        className="h-[70%] w-[70%] object-contain"
      />
    </div>
  );
}

function ChainPicker({
  value,
  onChange,
  label,
  exclude,
}: {
  value: ChainMeta;
  onChange: (c: ChainMeta) => void;
  label: string;
  exclude?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="group flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-left transition-colors hover:bg-secondary">
          <ChainBadge chain={value} size={28} />
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <span className="text-sm font-semibold text-foreground">{value.name}</span>
          </div>
          <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select {label.toLowerCase()} network</DialogTitle>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-1">
          {CHAINS.filter((c) => c.id !== exclude).map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-secondary",
                c.id === value.id && "bg-secondary",
              )}
            >
              <ChainBadge chain={c} size={32} />
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.testnet ? "Testnet" : "Mainnet"} · Chain ID {c.id}
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BridgeCard() {
  const [from, setFrom] = useState<ChainMeta>(CHAINS[0]);
  const [to, setTo] = useState<ChainMeta>(CHAINS[1]);
  const [amount, setAmount] = useState("");
  const [confirmedDialogOpen, setConfirmedDialogOpen] = useState(false);
  const [messageId, setMessageId] = useState<`0x${string}` | null>(null);

  const { data: ethPrice = 1800, isLoading: priceLoading } = useQuery({
    queryKey: ["eth-price"],
    queryFn: fetchEthPrice,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { address, isConnected, chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
    chainId: from.id,
    query: { enabled: !!address },
  });
  const destContract = BRIDGE_CHAINS[to.id]?.contract;
  const { data: destPoolBalance } = useBalance({
    address: destContract,
    chainId: to.id,
    query: { enabled: !!destContract, refetchInterval: 15000 },
  });

  const {
    writeContract,
    data: txHash,
    isPending: sending,
    reset: resetWrite,
  } = useWriteContract();
  const {
    data: receipt,
    isLoading: confirming,
    isSuccess: confirmed,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: from.id,
  });

  useEffect(() => {
    if (receipt) {
      const id = getMessageIdFromReceipt(receipt);
      if (id) setMessageId(id);
    }
  }, [receipt]);

  useEffect(() => {
    if (confirmed && txHash) {
      toast.success("Bridge transaction confirmed", {
        description: "Funds will arrive on the destination chain shortly.",
      });
      setConfirmedDialogOpen(true);
      refetchBalance();
    }
  }, [confirmed, txHash, refetchBalance]);

  const closeConfirmedDialog = () => {
    setConfirmedDialogOpen(false);
    setAmount("");
    setMessageId(null);
    resetWrite();
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const numAmount = Number(amount || "0");
  const receiveAmount = numAmount > 0 ? (numAmount * 0.9985).toFixed(6) : "0";
  // const fee = numAmount > 0 ? (numAmount * 0.0015).toFixed(6) : "0";

  const needsSwitch = isConnected && chainId !== from.id;
  const insufficientBalance =
    isConnected && balance && numAmount > Number(balance.formatted);
  const insufficientPool =
    !!destPoolBalance && numAmount > 0 && numAmount > Number(destPoolBalance.formatted);
  const routeSupported = isBridgeSupported(from.id) && isBridgeSupported(to.id);
  const busy = sending || confirming;

  const cta = useMemo(() => {
    if (!isConnected) return { label: "Connect wallet", disabled: false };
    if (!routeSupported)
      return { label: "Route not supported (testnet only)", disabled: true };
    if (!amount || numAmount <= 0) return { label: "Enter an amount", disabled: true };
    if (needsSwitch)
      return { label: `Switch to ${from.name}`, disabled: false, action: "switch" as const };
    if (insufficientBalance)
      return { label: `Insufficient ${balance?.symbol}`, disabled: true };
    if (insufficientPool)
      return { label: `Insufficient pool balance on ${to.name}`, disabled: true };
    if (sending) return { label: "Confirm in wallet…", disabled: true };
    if (confirming) return { label: "Bridging…", disabled: true };
    return { label: `Bridge to ${to.name}`, disabled: false, action: "bridge" as const };
  }, [
    isConnected,
    routeSupported,
    amount,
    numAmount,
    needsSwitch,
    insufficientBalance,
    insufficientPool,
    balance,
    sending,
    confirming,
    from,
    to,
  ]);

  const handleBridge = () => {
    if (!address) return;
    const src = BRIDGE_CHAINS[from.id];
    const dst = BRIDGE_CHAINS[to.id];
    if (!src || !dst) {
      toast.error("Unsupported route");
      return;
    }
    try {
      const value = parseEther(amount as `${number}`);
      writeContract(
        {
          address: src.contract,
          abi: BRIDGE_ABI,
          functionName: "bridgeETH",
          args: [dst.selector, address],
          value,
          chainId: src.chainId,
        },
        {
          onSuccess: (hash) => {
            toast.success("Transaction submitted", {
              description: `${hash.slice(0, 10)}…${hash.slice(-6)}`,
            });
          },
          onError: (err) => {
            toast.error("Bridge failed", { description: err.message.split("\n")[0] });
          },
        },
      );
    } catch (e) {
      toast.error("Invalid amount", {
        description: e instanceof Error ? e.message : "Try a smaller amount",
      });
    }
  };


  return (
    <div className="w-full max-w-[460px]">
      <div className="relative rounded-3xl border border-border/60 bg-card/80 p-1.5 shadow-2xl shadow-primary/10 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-end px-4 pt-3 pb-2">
          <button className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <Settings2 className="h-4 w-4" />
          </button>
        </div>

        {/* From */}
        <div className="rounded-2xl bg-secondary/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              From
            </span>
            <ChainPicker value={from} onChange={setFrom} label="From" exclude={to.id} />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <input
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => {
                const v = e.target.value.replace(/,/g, ".");
                if (/^\d*\.?\d*$/.test(v)) setAmount(v);
              }}
              className="min-w-0 flex-1 bg-transparent text-4xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/40"
            />
            <div className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-neutral-900 p-1">
                <img
                  src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png"
                  alt="ETH"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-sm font-semibold text-foreground">ETH</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              ${numAmount > 0 ? (numAmount * ethPrice).toFixed(2) : "0.00"}
              {priceLoading && (
                <span className="ml-1 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-muted-foreground/40" />
              )}
            </span>
            {isConnected && balance && (
              <button
                onClick={() => setAmount(balance.formatted)}
                className="rounded-md px-1.5 py-0.5 font-medium text-primary transition-colors hover:bg-primary/10"
              >
                Balance: {Number(balance.formatted).toFixed(4)} {balance.symbol} · Max
              </button>
            )}
          </div>
        </div>

        {/* Swap button */}
        <div className="relative h-0">
          <button
            onClick={swap}
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl border-4 border-card bg-secondary p-2 text-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:rotate-180"
            aria-label="Swap chains"
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>

        {/* To */}
        <div className="mt-1.5 rounded-2xl bg-secondary/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              To
            </span>
            <ChainPicker value={to} onChange={setTo} label="To" exclude={from.id} />

          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="min-w-0 flex-1 truncate text-4xl font-semibold text-muted-foreground/60">
              {receiveAmount}
            </div>
            <div className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-neutral-900 p-1">
                <img
                  src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png"
                  alt="ETH"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-sm font-semibold text-foreground">ETH</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              ${numAmount > 0 ? (numAmount * ethPrice * 0.9985).toFixed(2) : "0.00"}
              {priceLoading && (
                <span className="ml-1 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-muted-foreground/40" />
              )}
            </span>
            {destPoolBalance && (
              <span className={cn(insufficientPool && "text-destructive")}>
                Pool: {Number(destPoolBalance.formatted).toFixed(4)} {destPoolBalance.symbol}
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="mt-2 space-y-1.5 px-4 py-3 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-primary" />
              Est. time
            </span>
            <span className="text-foreground">~15-20 minutes</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Bridge fee</span>
            <span className="text-foreground">
              {/* {fee} */}
               paid By BridgeX
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Route</span>
            <span className="text-foreground">
              {from.name} → {to.name}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="p-1.5 pt-0">
          {!isConnected ? (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button
                  onClick={openConnectModal}
                  size="lg"
                  className="h-14 w-full rounded-2xl text-base font-semibold"
                >
                  Connect wallet
                </Button>
              )}
            </ConnectButton.Custom>
          ) : (
            <Button
              size="lg"
              disabled={cta.disabled || switching || busy}
              onClick={() => {
                if (cta.action === "switch") switchChain({ chainId: from.id });
                else if (cta.action === "bridge") handleBridge();
              }}
              className="h-14 w-full rounded-2xl text-base font-semibold"
            >
              {switching ? "Switching network…" : cta.label}
            </Button>
          )}
        </div>
      </div>

      {txHash && (
        <a
          href={`${from.id === sepolia.id ? "https://sepolia.etherscan.io" : "https://sepolia.basescan.org"}/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
        >
          View transaction <ExternalLink className="h-3 w-3" />
        </a>
      )}

      <Dialog open={confirmedDialogOpen} onOpenChange={setConfirmedDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bridge submitted</DialogTitle>
            <DialogDescription>
              Your transaction has been confirmed on {from.name}.
            </DialogDescription>
          </DialogHeader>
          {txHash && (
            <div className="mt-2 space-y-3">
              {messageId && (
                <div className="rounded-xl bg-secondary/50 p-3 text-sm">
                  <div className="text-xs text-muted-foreground">CCIP message ID</div>
                  <div className="mt-1 break-all font-mono text-foreground">
                    {messageId.slice(0, 14)}…{messageId.slice(-12)}
                  </div>
                </div>
              )}
              {messageId && (
                <a
                  href={`https://ccip.chain.link/msg/${messageId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Link2 className="h-4 w-4" />
                  Track transaction on CCIP
                </a>
              )}
              <a
                href={`${from.id === sepolia.id ? "https://sepolia.etherscan.io" : "https://sepolia.basescan.org"}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
              >
                View on explorer <ExternalLink className="h-3 w-3" />
              </a>
              <Button onClick={closeConfirmedDialog} variant="outline" className="w-full rounded-xl">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <p className="mt-4 text-center text-xs text-muted-foreground space-y-1">
  <span className="block">
    Testnet bridging · Powered by Chainlink CCIP
  </span>

  <span className="inline-flex items-center gap-2">
    Built by Rakesh Kumar Barik

    {/* LinkedIn */}
    <a
      href="https://www.linkedin.com/in/rakeshkumarbarik"
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-blue-600 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M20.45 20.45h-3.554v-5.569c0-1.328-.027-3.036-1.851-3.036-1.852 0-2.136 1.445-2.136 2.939v5.666H9.355V9h3.414v1.561h.049c.476-.9 1.637-1.851 3.37-1.851 3.604 0 4.269 2.373 4.269 5.455v6.285zM5.337 7.433a2.062 2.062 0 11.001-4.124 2.062 2.062 0 01-.001 4.124zM6.814 20.45H3.861V9h2.953v11.45z"/>
      </svg>
    </a>

    {/* GitHub */}
    <a
      href="https://github.com/Rakeshrkb"
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.424 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.866-.014-1.7-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.607.069-.607 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.338-2.22-.254-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.254-.446-1.275.098-2.659 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.026 2.747-1.026.546 1.384.203 2.405.1 2.659.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.694-4.566 4.944.359.31.678.92.678 1.855 0 1.338-.012 2.418-.012 2.747 0 .268.18.58.688.481A10.02 10.02 0 0022 12.017C22 6.484 17.523 2 12 2z"/>
      </svg>
    </a>
  </span>
</p>
      
    </div>
  );
}
