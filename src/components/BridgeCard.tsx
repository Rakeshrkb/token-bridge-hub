import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ChevronDown, ExternalLink, Link2, History, Zap, Droplet } from "lucide-react";
import { createPublicClient, decodeFunctionData, formatEther, formatUnits, http, parseEther, parseUnits } from "viem";
import {
  useAccount,
  useBalance,
  useReadContract,
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
import {
  BRIDGE_ABI,
  RATE_LIMITER_ABI,
  BRIDGE_CHAINS,
  BRIDGE_TOKENS,
  ERC20_ABI,
  NATIVE_TOKEN,
  ZERO_ADDRESS,
  getBridgeChainBySelector,
  getTokenPoolAddress,
  getMessageIdFromReceipt,
  getTokenAddress,
  isBridgeSupported,
  SEPOLIA_BRIDGE_DEPLOYMENT_BLOCK,
  BASE_SEPOLIA_BRIDGE_DEPLOYMENT_BLOCK,
  type BridgeTokenMeta,
  CROSS_TOKEN_ABI,
} from "@/lib/bridge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const sepoliaClient = createPublicClient({
  chain: sepolia,
  // The chain's default public RPC does not reliably serve historical logs.
  transport: http("https://sepolia.gateway.tenderly.co"),
});

const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://base-sepolia.gateway.tenderly.co"),
});

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

type BridgeActivity = {
  messageId: `0x${string}`;
  receiver: `0x${string}`;
  amount: bigint;
  source: ChainMeta;
  destination: ChainMeta | undefined;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  tokenSymbol: string;
  tokenDecimals: number;
  explorerTxUrl: string;
};

function resolveTokenMeta(chainId: number, tokenAddress: `0x${string}`) {
  if (tokenAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    return { symbol: NATIVE_TOKEN.symbol, decimals: NATIVE_TOKEN.decimals };
  }
  const chainTokens = BRIDGE_CHAINS[chainId]?.tokens ?? {};
  const key = Object.keys(chainTokens).find(
    (k) => chainTokens[k].toLowerCase() === tokenAddress.toLowerCase(),
  );
  if (key) {
    const meta = BRIDGE_TOKENS.find((t) => t.key === key);
    if (meta) return { symbol: meta.symbol, decimals: meta.decimals };
  }
  return { symbol: "TOKEN", decimals: 18 };
}

const EXPLORERS: Record<number, string> = {
  [sepolia.id]: "https://sepolia.etherscan.io/tx/",
  [baseSepolia.id]: "https://sepolia.basescan.org/tx/",
};

async function fetchChainBridgeActivity(
  client: any,
  sourceChain: ChainMeta,
  fromBlock: bigint,
  address: `0x${string}`,
): Promise<BridgeActivity[]> {
  const contract = BRIDGE_CHAINS[sourceChain.id].contract;
  const logs = await client.getLogs({
    address: contract,
    event: BRIDGE_ABI[1],
    fromBlock,
  });

  const matching = (logs as any[]).filter(
    (log) => log.args.receiver?.toLowerCase() === address.toLowerCase(),
  );

  // Decode token from tx input (Sent event does not include token address)
  const results = await Promise.all(
    matching.map(async (log: any) => {
      let tokenAddress: `0x${string}` = ZERO_ADDRESS;
      try {
        const tx = await client.getTransaction({ hash: log.transactionHash });
        const decoded = decodeFunctionData({ abi: BRIDGE_ABI, data: tx.input });
        if (decoded.functionName === "bridge") {
          tokenAddress = decoded.args[2] as `0x${string}`;
        }
      } catch {
        // fall back to native
      }
      const { symbol, decimals } = resolveTokenMeta(sourceChain.id, tokenAddress);
      const destinationConfig = getBridgeChainBySelector(log.args.destinationChainSelector!);
      const destination = CHAINS.find((chain) => chain.id === destinationConfig?.chainId);

      return {
        messageId: log.args.messageId!,
        receiver: log.args.receiver!,
        amount: log.args.amount!,
        source: sourceChain,
        destination,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        tokenSymbol: symbol,
        tokenDecimals: decimals,
        explorerTxUrl: `${EXPLORERS[sourceChain.id]}${log.transactionHash}`,
      } satisfies BridgeActivity;
    }),
  );

  return results;
}

async function fetchBridgeActivity(address: `0x${string}`): Promise<BridgeActivity[]> {
  const sepoliaMeta = CHAINS.find((c) => c.id === sepolia.id)!;
  const baseMeta = CHAINS.find((c) => c.id === baseSepolia.id)!;
  const [sep, base] = await Promise.all([
    fetchChainBridgeActivity(sepoliaClient, sepoliaMeta, SEPOLIA_BRIDGE_DEPLOYMENT_BLOCK, address).catch(() => []),
    fetchChainBridgeActivity(baseSepoliaClient, baseMeta, BASE_SEPOLIA_BRIDGE_DEPLOYMENT_BLOCK, address).catch(() => []),
  ]);
  return [...sep, ...base].sort((a, b) => {
    if (a.source.id !== b.source.id) return Number(b.blockNumber - a.blockNumber);
    return Number(b.blockNumber - a.blockNumber);
  });
}


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
  const [token, setToken] = useState<BridgeTokenMeta>(NATIVE_TOKEN);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [confirmedDialogOpen, setConfirmedDialogOpen] = useState(false);
  const [messageId, setMessageId] = useState<`0x${string}` | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [approving, setApproving] = useState(false);

  const { data: ethPrice = 1800, isLoading: priceLoading } = useQuery({
    queryKey: ["eth-price"],
    queryFn: fetchEthPrice,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { address, isConnected, chainId } = useAccount();

  const {
    writeContractAsync: faucetWriteAsync,
    data: faucetTxHash,
    reset: resetFaucetWrite,
  } = useWriteContract();

  const { isLoading: faucetConfirming, isSuccess: faucetConfirmed } =
    useWaitForTransactionReceipt({
      hash: faucetTxHash,
      chainId: from.id,
    });
  const {
    data: activity = [],
    isFetching: activityLoading,
    error: activityError,
  } = useQuery({
    queryKey: ["sepolia-bridge-activity", address],
    queryFn: () => fetchBridgeActivity(address!),
    enabled: activityOpen && !!address,
    staleTime: 30_000,
  });
  const { switchChainAsync, isPending: switching } = useSwitchChain();

  const srcContract = BRIDGE_CHAINS[from.id]?.contract;
  const destContract = BRIDGE_CHAINS[to.id]?.contract;
  const srcTokenAddress = getTokenAddress(from.id, token.key);
  const destTokenAddress = getTokenAddress(to.id, token.key);
  const [faucetSubmitting, setFaucetSubmitting] = useState(false);
  const faucetBusy = faucetSubmitting || faucetConfirming;
  const FAUCET_AMOUNT = 100; // 100 cross tokens

  // Native balance for wallet on source chain (used for ETH bridging + gas hint)
  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address,
    chainId: from.id,
    query: { enabled: !!address },
  });

  // ERC20 balance for wallet on source chain
  const { data: erc20WalletBalance, refetch: refetchErc20Balance } = useReadContract({
    address: srcTokenAddress && srcTokenAddress !== ZERO_ADDRESS ? srcTokenAddress : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: from.id,
    query: {
      enabled: !token.isNative && !!address && !!srcTokenAddress && srcTokenAddress !== ZERO_ADDRESS,
    },
  });

  const crossTokenAddress = getTokenAddress(from.id, "CROSS");

  const { data: lastMintTime, refetch: refetchLastMint } = useReadContract({
    address: crossTokenAddress,
    abi: CROSS_TOKEN_ABI,
    functionName: "lastMint",
    args: address ? [address] : undefined,
    chainId: from.id,
    query: { enabled: !!address && !!crossTokenAddress },
  });

  const faucetOnCooldown =
    lastMintTime !== undefined &&
    Date.now() / 1000 < Number(lastMintTime) + 3600;

  // Allowance for ERC20 towards bridge contract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: srcTokenAddress && srcTokenAddress !== ZERO_ADDRESS ? srcTokenAddress : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && srcContract ? [address, srcContract] : undefined,
    chainId: from.id,
    query: {
      enabled:
        !token.isNative && !!address && !!srcContract && !!srcTokenAddress && srcTokenAddress !== ZERO_ADDRESS,
    },
  });

  // Destination pool balance — native or ERC20
  const { data: destNativePool } = useBalance({
    address: destContract,
    chainId: to.id,
    query: { enabled: token.isNative && !!destContract, refetchInterval: 15000 },
  });

  const srcTokenPoolAddress = !token.isNative
    ? getTokenPoolAddress(from.id, token.key)
    : undefined;

  const { data: rateLimiterState, error: rateLimiterError } = useReadContract({
    address: srcTokenPoolAddress,
    abi: RATE_LIMITER_ABI,
    functionName: "getCurrentRateLimiterState",
    args: BRIDGE_CHAINS[to.id]?.selector
      ? [BRIDGE_CHAINS[to.id].selector, false] // fastFinality = false
      : undefined,
    chainId: from.id,
    query: {
      enabled: !token.isNative && !!srcTokenPoolAddress && !!BRIDGE_CHAINS[to.id]?.selector,
      refetchInterval: 15000,
    },
  });

  const outboundState = rateLimiterState ? (rateLimiterState as any)[0] : undefined;

  const availableCapacity = outboundState ? (outboundState.tokens as bigint) : undefined;
  const rateLimitEnabled = outboundState ? (outboundState.isEnabled as boolean) : false;


  const walletBalanceRaw: bigint | undefined = token.isNative
    ? nativeBalance?.value
    : (erc20WalletBalance as bigint | undefined);
  const walletBalanceFormatted = walletBalanceRaw !== undefined
    ? formatUnits(walletBalanceRaw, token.decimals)
    : undefined;

  const destPoolRaw: bigint | undefined = token.isNative
    ? destNativePool?.value
    : undefined; // (destErc20Pool as bigint | undefined);
  const destPoolFormatted = destPoolRaw !== undefined
    ? formatUnits(destPoolRaw, token.decimals)
    : undefined;

  const {
    writeContract,
    writeContractAsync,
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
      refetchNativeBalance();
      refetchErc20Balance();
      refetchAllowance();
    }
  }, [confirmed, txHash, refetchNativeBalance, refetchErc20Balance, refetchAllowance]);

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

  let parsedAmount: bigint = 0n;
  let parseErr = false;
  try {
    parsedAmount = amount ? parseUnits(amount as `${number}`, token.decimals) : 0n;
  } catch {
    parseErr = true;
  }

  const needsSwitch = isConnected && chainId !== from.id;
  const insufficientBalance =
    isConnected &&
    walletBalanceRaw !== undefined &&
    parsedAmount > walletBalanceRaw;
  const insufficientPool =
    token.isNative &&
    destPoolRaw !== undefined &&
    parsedAmount > 0n &&
    parsedAmount > destPoolRaw;
  const routeSupported =
    isBridgeSupported(from.id) &&
    isBridgeSupported(to.id) &&
    !!srcTokenAddress &&
    !!destTokenAddress;
  const needsApproval =
    !token.isNative &&
    parsedAmount > 0n &&
    (allowance === undefined || (allowance as bigint) < parsedAmount);
  const busy = sending || confirming || approving;
  const exceedsRateLimit =
    rateLimitEnabled &&
    availableCapacity !== undefined &&
    parsedAmount > 0n &&
    parsedAmount > availableCapacity;
  console.log({
    srcTokenPoolAddress,
    outboundState,
    availableCapacity,
    rateLimitEnabled,
    exceedsRateLimit,
  });

  const cta = useMemo(() => {
    if (!isConnected) return { label: "Connect wallet", disabled: false };
    if (!routeSupported)
      return { label: "Route not supported", disabled: true };
    if (!amount || parseErr || parsedAmount <= 0n)
      return { label: "Enter an amount", disabled: true };
    if (needsSwitch)
      return { label: `Switch to ${from.name}`, disabled: false, action: "switch" as const };
    if (insufficientBalance)
      return { label: `Insufficient ${token.symbol}`, disabled: true };
    if (insufficientPool)
      return { label: `Insufficient pool balance on ${to.name}`, disabled: true };
    if (approving) return { label: "Approving…", disabled: true };
    if (sending) return { label: "Confirm in wallet…", disabled: true };
    if (confirming) return { label: "Bridging…", disabled: true };
    if (exceedsRateLimit)
      return {
        label: `Max ${formatUnits(availableCapacity as bigint, token.decimals)} ${token.symbol} available right now`,
        disabled: true,
      };
    if (needsApproval)
      return { label: `Approve ${token.symbol}`, disabled: false, action: "approve" as const };
    return { label: `Bridge to ${to.name}`, disabled: false, action: "bridge" as const };
  }, [
    exceedsRateLimit,
    availableCapacity,
    isConnected,
    routeSupported,
    amount,
    parseErr,
    parsedAmount,
    needsSwitch,
    insufficientBalance,
    insufficientPool,
    approving,
    sending,
    confirming,
    needsApproval,
    token,
    from,
    to,
  ]);

  const handleApprove = async () => {
    if (!address || !srcContract || !srcTokenAddress) return;
    try {
      setApproving(true);
      const hash = await writeContractAsync({
        address: srcTokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [srcContract, parsedAmount],
        chainId: from.id,
      });
      toast.success("Approval submitted", {
        description: `${hash.slice(0, 10)}…${hash.slice(-6)}`,
      });
      // Wait a beat then refetch allowance
      setTimeout(() => refetchAllowance(), 1500);
    } catch (e) {
      toast.error("Approval failed", {
        description: e instanceof Error ? e.message.split("\n")[0] : "Try again",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleFaucetMint = async () => {
    const crossToken = BRIDGE_TOKENS.find((t) => t.key === "CROSS");
    if (!crossToken || !crossTokenAddress) return;

    if (chainId !== from.id) {
      await switchChainAsync({ chainId: from.id });
    }

    // Switch the selected token to CROSS so balance/UI reflects the mint
    if (token.key !== "CROSS") setToken(crossToken);

    try {
      setFaucetSubmitting(true);
      await faucetWriteAsync({
        address: crossTokenAddress,
        abi: CROSS_TOKEN_ABI,
        functionName: "mintFaucet",
        chainId: from.id,
      });
    } catch (e) {
      toast.error("Faucet mint failed", {
        description: e instanceof Error ? e.message.split("\n")[0] : "Try again",
      });
    } finally {
      setFaucetSubmitting(false);
    }
  };

  useEffect(() => {
    if (faucetConfirmed) {
      toast.success("Faucet mint confirmed", {
        description: `${FAUCET_AMOUNT} ${token.symbol} added to your wallet`,
      });
      refetchErc20Balance();
      refetchLastMint();
      resetFaucetWrite();
    }
  }, [faucetConfirmed]);


  const handleBridge = () => {
    if (!address) return;
    const src = BRIDGE_CHAINS[from.id];
    const dst = BRIDGE_CHAINS[to.id];
    if (!src || !dst) {
      toast.error("Unsupported route");
      return;
    }
    try {
      const isNative = token.isNative;
      const tokenArg: `0x${string}` = isNative
        ? ZERO_ADDRESS
        : (srcTokenAddress as `0x${string}`);
      const amountArg = isNative ? 0n : parsedAmount;
      const value = isNative ? parseEther(amount as `${number}`) : 0n;

      writeContract(
        {
          address: src.contract,
          abi: BRIDGE_ABI,
          functionName: "bridge",
          args: [dst.selector, address, tokenArg, amountArg],
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
        <div className="flex items-center justify-end gap-1 px-4 pt-3 pb-2">
          {isConnected && (
            <button
              onClick={handleFaucetMint}
              disabled={faucetBusy || faucetOnCooldown}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground disabled:hover:bg-transparent",
                faucetBusy && "animate-pulse text-primary",
                faucetOnCooldown && !faucetBusy && "opacity-50",
              )}
            >
              <Droplet className={cn("h-4 w-4", faucetBusy && "animate-pulse")} />
              <span>
                {faucetSubmitting
                  ? "Confirm in wallet…"
                  : faucetConfirming
                    ? "Minting…"
                    : faucetOnCooldown
                      ? "Faucet on cooldown"
                      : "Get CROSS"}
              </span>
            </button>
          )}
          <button
            onClick={() => setActivityOpen(true)}
            className="flex items-center gap-2 rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
          >
            <History className="h-4 w-4" />
            <span>Activity</span>
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
            <button
              onClick={() => setTokenPickerOpen(true)}
              className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-2 transition-colors hover:bg-background"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-neutral-900 p-1">
                <img
                  src={token.logo}
                  alt={token.symbol}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-sm font-semibold text-foreground">{token.symbol}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {token.isNative ? (
                <>
                  ${numAmount > 0 ? (numAmount * ethPrice).toFixed(2) : "0.00"}
                  {priceLoading && (
                    <span className="ml-1 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-muted-foreground/40" />
                  )}
                </>
              ) : (
                <span className="opacity-60">Testnet token</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {!token.isNative && rateLimitEnabled && availableCapacity !== undefined && (
                <span className={cn(exceedsRateLimit && "text-destructive")}>
                  Per Tx: {formatUnits(availableCapacity, token.decimals)} {token.symbol}
                </span>
              )}
              {isConnected && walletBalanceFormatted !== undefined && (
                <button
                  onClick={() => setAmount(walletBalanceFormatted)}
                  className="rounded-md px-1.5 py-0.5 font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  Balance: {Number(walletBalanceFormatted).toFixed(4)} {token.symbol} · Max
                </button>
              )}
            </div>
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
                  src={token.logo}
                  alt={token.symbol}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-sm font-semibold text-foreground">{token.symbol}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {token.isNative ? (
                <>
                  ${numAmount > 0 ? (numAmount * ethPrice * 0.9985).toFixed(2) : "0.00"}
                  {priceLoading && (
                    <span className="ml-1 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-muted-foreground/40" />
                  )}
                </>
              ) : (
                <span className="opacity-60">Testnet token</span>
              )}
            </span>
            {destPoolFormatted !== undefined && (
              <span className={cn(insufficientPool && "text-destructive")}>
                Pool: {Number(destPoolFormatted).toFixed(4)} {token.symbol}
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
                if (cta.action === "switch") switchChainAsync({ chainId: from.id });
                else if (cta.action === "approve") handleApprove();
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

      <Dialog open={tokenPickerOpen} onOpenChange={setTokenPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select token to bridge</DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-1">
            {BRIDGE_TOKENS.map((t) => {
              const availableOnRoute =
                !!getTokenAddress(from.id, t.key) && !!getTokenAddress(to.id, t.key);
              return (
                <button
                  key={t.key}
                  disabled={!availableOnRoute}
                  onClick={() => {
                    setToken(t);
                    setTokenPickerOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40",
                    t.key === token.key && "bg-secondary",
                  )}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-neutral-900 p-1 border border-border/50">
                    <img
                      src={t.logo}
                      alt={t.symbol}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{t.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.isNative ? "Native ETH · lock & release" : "ERC-20 · CCIP token pool"}
                    </div>
                  </div>
                  {!availableOnRoute && (
                    <span className="text-[10px] uppercase text-muted-foreground">
                      Unavailable
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>


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

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Activity</DialogTitle>
            <DialogDescription>
              {address
                ? "Recent cross-chain transactions"
                : "Connect the wallet whose bridge transfers you want to view."}
            </DialogDescription>
          </DialogHeader>

          {!address ? (
            <div className="rounded-xl bg-secondary/40 p-5 text-sm text-muted-foreground">
              Connect your wallet to load its bridge activity.
            </div>
          ) : activityLoading ? (
            <div className="rounded-xl bg-secondary/40 p-5 text-sm text-muted-foreground">
              Loading transfers from Sepolia…
            </div>
          ) : activityError ? (
            <div className="rounded-xl bg-destructive/10 p-5 text-sm text-destructive">
              Could not load bridge activity. Please try again.
            </div>
          ) : activity.length === 0 ? (
            <div className="rounded-xl bg-secondary/40 p-5 text-sm text-muted-foreground">
              No Sepolia bridge transfers found for this wallet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.map((transfer: BridgeActivity) => (
                  <TableRow key={`${transfer.transactionHash}-${transfer.messageId}`}>
                    <TableCell className="font-medium">{transfer.source.name}</TableCell>
                    <TableCell>{transfer.destination?.name ?? "Unknown chain"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {transfer.receiver.slice(0, 8)}…{transfer.receiver.slice(-6)}
                    </TableCell>
                    <TableCell>
                      {formatUnits(transfer.amount, transfer.tokenDecimals)} {transfer.tokenSymbol}
                    </TableCell>
                    <TableCell>
                      <a
                        href={transfer.explorerTxUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {transfer.transactionHash.slice(0, 8)}…{transfer.transactionHash.slice(-6)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              <path d="M20.45 20.45h-3.554v-5.569c0-1.328-.027-3.036-1.851-3.036-1.852 0-2.136 1.445-2.136 2.939v5.666H9.355V9h3.414v1.561h.049c.476-.9 1.637-1.851 3.37-1.851 3.604 0 4.269 2.373 4.269 5.455v6.285zM5.337 7.433a2.062 2.062 0 11.001-4.124 2.062 2.062 0 01-.001 4.124zM6.814 20.45H3.861V9h2.953v11.45z" />
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
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.424 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.866-.014-1.7-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.607.069-.607 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.338-2.22-.254-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.254-.446-1.275.098-2.659 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.026 2.747-1.026.546 1.384.203 2.405.1 2.659.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.694-4.566 4.944.359.31.678.92.678 1.855 0 1.338-.012 2.418-.012 2.747 0 .268.18.58.688.481A10.02 10.02 0 0022 12.017C22 6.484 17.523 2 12 2z" />
            </svg>
          </a>
        </span>
      </p>

    </div>
  );
}
