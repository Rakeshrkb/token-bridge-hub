import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  SMART_ACCOUNT_FACTORY,
  SMART_ACCOUNT_FACTORY_ABI,
  DEFAULT_SALT,
} from "@/lib/smartAccount";
import { useMemo } from "react";
import { useWalletClient } from "wagmi";
import { createPublicClient, http, type Address } from "viem";
import { createBundlerClient, createPaymasterClient } from "viem/account-abstraction";
import { sepolia, baseSepolia, polygonAmoy, bscTestnet } from "wagmi/chains";
import { toBridgeXSmartAccount } from "@/lib/smartAccount";

const CHAIN_BY_ID = { [sepolia.id]: sepolia, [baseSepolia.id]: baseSepolia, [polygonAmoy.id]: polygonAmoy, [bscTestnet.id]: bscTestnet } as const;
const FACTORY_ADDRESS: Record<number, Address> = {
  [sepolia.id]: "0x47a1999566c71d1E2201D2Fac1771A89b233880e",
  [baseSepolia.id]: "0x47a1999566c71d1E2201D2Fac1771A89b233880e",
  [polygonAmoy.id]: "0x47a1999566c71d1E2201D2Fac1771A89b233880e",
  [bscTestnet.id]: "0x47a1999566c71d1E2201D2Fac1771A89b233880e",
};

/**
 * App-wide access to the connected wallet's deterministic smart account.
 * Usage: const { smartAccountAddress, isDeployed } = useSmartAccount();
 */
const bundlerUrl = (chainId: number) =>
  `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${import.meta.env.VITE_PIMLICO_API_KEY}`;

/**
 * App-wide access to the connected wallet's deterministic smart account.
 * Pass the chain the account should ACT on (usually the bridge card's `from.id`).
 * Falls back to the wallet's currently-connected chain if omitted.
 */
export function useSmartAccount(targetChainId?: number) {
  const { address, chainId: connectedChainId } = useAccount();
  const chainId = targetChainId ?? connectedChainId;
  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient({ chainId });

  const { data, isLoading: isAddressLoading } = useReadContract({
    address: SMART_ACCOUNT_FACTORY,
    abi: SMART_ACCOUNT_FACTORY_ABI,
    functionName: "getAddress",
    args: address ? [address, DEFAULT_SALT] : undefined,
    chainId,
    query: { enabled: Boolean(address) },
  });

  const smartAccountAddress = data as `0x${string}` | undefined;

  const { data: isDeployed, isLoading: isDeployLoading } = useQuery({
    queryKey: ["smart-account-deployed", smartAccountAddress, chainId],
    enabled: Boolean(smartAccountAddress && publicClient),
    refetchInterval: 15_000,
    queryFn: async () => {
      const code = await publicClient!.getCode({ address: smartAccountAddress! });
      return Boolean(code && code !== "0x");
    },
  });

  // Account object + bundler client, only buildable once we have a signer for this chain.
  const { data: account } = useQuery({
    queryKey: ["smart-account-obj", address, chainId],
    queryFn: () =>
      toBridgeXSmartAccount({
        client: publicClient!,
        owner: address!,
        walletClient: walletClient!,
        factoryAddress: SMART_ACCOUNT_FACTORY,
      }),
    enabled: Boolean(address && publicClient && walletClient),
  });

  const paymasterClient = useMemo(
    () => (chainId ? createPaymasterClient({ transport: http(bundlerUrl(chainId)) }) : undefined),
    [chainId],
  );

  const bundlerClient = useMemo(() => {
    if (!account || !publicClient || !chainId) return undefined;
    return createBundlerClient({
      account,
      client: publicClient,
      paymaster: paymasterClient, // sponsored gas -> "Bridge fee: paid By BridgeX"
      transport: http(bundlerUrl(chainId)),
    });
  }, [account, publicClient, paymasterClient, chainId]);

  return {
    owner: address,
    chainId,
    smartAccountAddress,
    isDeployed: isDeployed ?? false,
    isLoading: isAddressLoading || isDeployLoading,
    account,
    bundlerClient,
  };
}