import type { Address } from "viem";

export const tipStreamAddress = (process.env.NEXT_PUBLIC_TIPSTREAM_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as Address;

export const isContractConfigured = tipStreamAddress !== "0x0000000000000000000000000000000000000000";

export const tipStreamAbi = [
  {
    type: "function", name: "createStream", stateMutability: "payable",
    inputs: [{ name: "recipient", type: "address" }, { name: "duration", type: "uint40" }],
    outputs: [{ name: "streamId", type: "uint256" }],
  },
  {
    type: "function", name: "withdraw", stateMutability: "nonpayable",
    inputs: [{ name: "streamId", type: "uint256" }], outputs: [],
  },
  {
    type: "function", name: "cancel", stateMutability: "nonpayable",
    inputs: [{ name: "streamId", type: "uint256" }], outputs: [],
  },
  {
    type: "function", name: "nextStreamId", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function", name: "getStream", stateMutability: "view",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: [{
      name: "stream", type: "tuple", components: [
        { name: "sender", type: "address" }, { name: "recipient", type: "address" },
        { name: "deposit", type: "uint256" }, { name: "withdrawn", type: "uint256" },
        { name: "startTime", type: "uint40" }, { name: "endTime", type: "uint40" },
        { name: "canceledAt", type: "uint40" },
      ],
    }],
  },
  {
    type: "function", name: "availableBalance", stateMutability: "view",
    inputs: [{ name: "streamId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export type Stream = {
  id: bigint;
  sender: Address;
  recipient: Address;
  deposit: bigint;
  withdrawn: bigint;
  startTime: number;
  endTime: number;
  canceledAt: number;
};
