"use client";

import { Check, CircleAlert, LogOut, Wallet, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { botchainMainnet } from "@/lib/wagmi";

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

type Props = {
  label?: string;
  onConnected?: () => void;
};

export function WalletButton({ label = "Connect wallet", onConnected }: Props) {
  const { address, chainId, connector: activeConnector, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect, isPending: disconnecting } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [startedHere, setStartedHere] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogTitleId = useId();

  useEffect(() => {
    if (startedHere && isConnected && chainId === botchainMainnet.id) {
      onConnected?.();
      setStartedHere(false);
    }
  }, [chainId, isConnected, onConnected, startedHere]);

  useEffect(() => {
    if (!isConnected) setAccountOpen(false);
  }, [isConnected]);

  useEffect(() => {
    if (!accountOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [accountOpen]);

  const connector = connectors[0];

  function connectWallet() {
    if (!connector) return;
    setStartedHere(true);
    connect({ connector });
  }

  if (isConnected && chainId !== botchainMainnet.id) {
    return (
      <button type="button" className="wallet-button wrong-network" onClick={() => switchChain({ chainId: botchainMainnet.id })} disabled={switching}>
        <CircleAlert size={17} /> {switching ? "Switching…" : "Switch network"}
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="wallet-control">
        <button
          type="button"
          className="wallet-button connected"
          onClick={() => setAccountOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={accountOpen}
        >
          <span className="online"><Check size={11} /></span>
          <span>{short(address)}</span>
        </button>

        {accountOpen ? (
          <div className="wallet-modal-backdrop" onMouseDown={() => setAccountOpen(false)}>
            <section
              className="wallet-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={dialogTitleId}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="wallet-modal-header">
                <div>
                  <p>Connected wallet</p>
                  <h2 id={dialogTitleId}>Your account</h2>
                </div>
                <button ref={closeButtonRef} type="button" className="wallet-modal-close" onClick={() => setAccountOpen(false)} aria-label="Close wallet dialog">
                  <X size={18} />
                </button>
              </div>

              <div className="wallet-account">
                <span className="online"><Check size={11} /></span>
                <div>
                  <strong>{short(address)}</strong>
                  <span>{activeConnector?.name ?? "Browser wallet"} · BOT Chain</span>
                </div>
              </div>
              <p className="wallet-address">{address}</p>

              <button type="button" className="disconnect-button" onClick={() => disconnect()} disabled={disconnecting}>
                <LogOut size={17} /> {disconnecting ? "Disconnecting…" : "Disconnect wallet"}
              </button>
            </section>
          </div>
        ) : null}
      </div>
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
