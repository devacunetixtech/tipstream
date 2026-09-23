"use client";

import { Check, CircleAlert, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { botchainTestnet } from "@/lib/wagmi";

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

type Props = {
  label?: string;
  onConnected?: () => void;
};

export function WalletButton({ label = "Connect wallet", onConnected }: Props) {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [startedHere, setStartedHere] = useState(false);

  useEffect(() => {
    if (startedHere && isConnected && chainId === botchainTestnet.id) {
      onConnected?.();
      setStartedHere(false);
    }
  }, [chainId, isConnected, onConnected, startedHere]);

  const connector = connectors[0];

  function connectWallet() {
    if (!connector) return;
    setStartedHere(true);
    connect({ connector });
  }

  if (isConnected && chainId !== botchainTestnet.id) {
    return (
      <button type="button" className="wallet-button wrong-network" onClick={() => switchChain({ chainId: botchainTestnet.id })} disabled={switching}>
        <CircleAlert size={17} /> {switching ? "Switching…" : "Switch network"}
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button type="button" className="wallet-button connected" onClick={() => disconnect()} title="Disconnect wallet">
        <span className="online"><Check size={11} /></span>
        <span>{short(address)}</span>
      </button>
    );
  }

  return (
    <span className="wallet-control">
      <button type="button" className="wallet-button" onClick={connectWallet} disabled={isPending || !connector}>
        <Wallet size={17} /> {isPending ? "Connecting…" : connector ? label : "Install a wallet"}
      </button>
      {error ? <span className="wallet-error" role="status">Wallet connection was not approved. Try again when you are ready.</span> : null}
    </span>
  );
}
