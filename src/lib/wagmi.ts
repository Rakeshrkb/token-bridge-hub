import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, baseSepolia, mainnet, base, arbitrum, optimism, polygon } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Bridgr",
  projectId: "3fbb6bba6f1de962d911bb5b5c9dba88", // public demo WalletConnect projectId
  chains: [sepolia, baseSepolia, mainnet, base, arbitrum, optimism, polygon],
  ssr: true,
});
