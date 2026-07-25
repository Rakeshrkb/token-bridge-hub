import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { sepolia, baseSepolia, polygonAmoy, bscTestnet } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Bridgr",
  projectId: "3fbb6bba6f1de962d911bb5b5c9dba88",
  chains: [sepolia, baseSepolia, polygonAmoy, bscTestnet],
  ssr: true,
  transports: {
  [sepolia.id]: http("https://sepolia.infura.io/v3/f69dcbb4b8514155b99c1431832ba811"),
  [baseSepolia.id]: http("https://base-sepolia.infura.io/v3/f69dcbb4b8514155b99c1431832ba811"),
  [polygonAmoy.id]: http("https://polygon-amoy.infura.io/v3/f69dcbb4b8514155b99c1431832ba811"),
  [bscTestnet.id]: http("https://bsc-testnet.infura.io/v3/f69dcbb4b8514155b99c1431832ba811"),
  },
});
