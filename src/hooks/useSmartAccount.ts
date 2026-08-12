import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  SMART_ACCOUNT_FACTORY,
  SMART_ACCOUNT_FACTORY_ABI,
  DEFAULT_SALT,
} from "@/lib/smartAccount";

/**
 * App-wide access to the connected wallet's deterministic smart account.
 * Usage: const { smartAccountAddress, isDeployed } = useSmartAccount();
 */
export function useSmartAccount() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId });

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

  return {
    owner: address,
    chainId,
    smartAccountAddress,
    isDeployed: isDeployed ?? false,
    isLoading: isAddressLoading || isDeployLoading,
  };
}
