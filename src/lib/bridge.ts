import { sepolia, baseSepolia } from "wagmi/chains";
import { decodeEventLog, type TransactionReceipt } from "viem";

export const BRIDGE_ABI = [
  {
    type: "function",
    name: "bridgeETH",
    stateMutability: "payable",
    inputs: [
      { name: "destinationChainSelector", type: "uint64" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "messageId", type: "bytes32" }],
  },
  {
    type: "event",
    name: "Sent",
    inputs: [
      { name: "messageId", type: "bytes32", indexed: false },
      { name: "destinationChainSelector", type: "uint64", indexed: false },
      { name: "receiver", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export function getMessageIdFromReceipt(receipt: TransactionReceipt): `0x${string}` | null {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: BRIDGE_ABI,
        data: log.data,
        topics: log.topics,
        eventName: "Sent",
      });
      if (decoded.eventName === "Sent") {
        return decoded.args.messageId;
      }
    } catch {
      // not a Sent event, continue scanning
    }
  }
  return null;
}

export type BridgeChainConfig = {
  chainId: number;
  contract: `0x${string}`;
  selector: bigint;
};

export const BRIDGE_CHAINS: Record<number, BridgeChainConfig> = {
  [sepolia.id]: {
    chainId: sepolia.id,
    contract: "0x730Db6e61E194951d8c4a43c2a9FF22b1fD2D36d",
    selector: 16015286601757825753n,
  },
  [baseSepolia.id]: {
    chainId: baseSepolia.id,
    contract: "0xE3Be36F99d9a1F253cBF669a72a12948902aF66C",
    selector: 10344971235874465080n,
  },
};

export const isBridgeSupported = (chainId: number) => chainId in BRIDGE_CHAINS;
