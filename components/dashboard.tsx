"use client";

import { Activity, ArrowDownLeft, ArrowLeft, ArrowUpRight, ExternalLink, LockKeyhole, Plus, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import type { Address } from "viem";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { CreateStream } from "./create-stream";
import { Logo } from "./logo";
import { StreamCard } from "./stream-card";
import { WalletButton } from "./wallet-button";
import { SiteFooter } from "./site-footer";
import { isContractConfigured, type Stream, tipStreamAbi, tipStreamAddress } from "@/lib/contract";
import { friendlyWalletError } from "@/lib/errors";
import { botchainMainnet } from "@/lib/wagmi";

type Filter = "active" | "incoming" | "completed";

export function Dashboard() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("active");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const showNotice = useCallback((message: string, error = false) => {
    setNotice({ message, error });
    window.setTimeout(() => setNotice(null), 5_000);
  }, []);

  const loadStreams = useCallback(async (showRefreshError = true): Promise<boolean> => {
    if (!publicClient || !address || !isContractConfigured || chainId !== botchainMainnet.id) {
      setStreams([]);
      return true;
    }
    setLoading(true);
    try {
      const count = await publicClient.readContract({ address: tipStreamAddress, abi: tipStreamAbi, functionName: "nextStreamId" });
      const start = count > 200n ? count - 200n : 0n;
      const ids = Array.from({ length: Number(count - start) }, (_, index) => start + BigInt(index));
      const rows: Stream[] = [];
      let failedReads = 0;

      // BOT Chain's public RPC can reject a large burst of reads. Small batches,
      // plus allSettled, keep one flaky response from hiding every valid stream.
      for (let offset = 0; offset < ids.length; offset += 10) {
        const results = await Promise.allSettled(ids.slice(offset, offset + 10).map(async (id) => {
          const data = await publicClient.readContract({ address: tipStreamAddress, abi: tipStreamAbi, functionName: "getStream", args: [id] });
          return { id, ...data, startTime: Number(data.startTime), endTime: Number(data.endTime), canceledAt: Number(data.canceledAt) } satisfies Stream;
        }));

        for (const result of results) {
          if (result.status === "fulfilled") rows.push(result.value);
          else failedReads += 1;
        }
      }

      const account = address.toLowerCase();
      setStreams(rows.filter((stream) => stream.sender.toLowerCase() === account || stream.recipient.toLowerCase() === account).reverse());
      if (failedReads > 0 && showRefreshError) {
        showNotice(`Loaded the available streams, but ${failedReads} could not be refreshed. Try again shortly.`, true);
      }
      return failedReads === 0;
    } catch {
      if (showRefreshError) {
        showNotice("We couldn't refresh your streams right now. Your on-chain streams are unchanged. Try again shortly.", true);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [address, chainId, publicClient, showNotice]);

  useEffect(() => { void loadStreams(); }, [loadStreams]);

  useEffect(() => {
    if (!isConnected || chainId !== botchainMainnet.id) return;
    const timer = window.setInterval(() => void loadStreams(), 12_000);
    return () => window.clearInterval(timer);
  }, [chainId, isConnected, loadStreams]);

  const onSubmitted = useCallback(async (hash: `0x${string}`) => {
    if (!publicClient) return;
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Transaction reverted");
    const refreshed = await loadStreams(false);
    showNotice(refreshed
      ? "Stream created successfully."
      : "Stream created successfully on-chain, but the list has not refreshed yet. Try refreshing shortly.");
  }, [loadStreams, publicClient, showNotice]);

  async function streamAction(action: "withdraw" | "cancel", id: bigint) {
    if (!isContractConfigured || !publicClient) return;
    setBusy(true);
    try {
      const hash = await writeContractAsync({ address: tipStreamAddress, abi: tipStreamAbi, functionName: action, args: [id] });
      showNotice("Transaction submitted. Waiting for confirmation…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Transaction reverted");
      const refreshed = await loadStreams(false);
      const confirmation = action === "withdraw" ? "Available BOT withdrawn." : "Stream canceled and unvested BOT refunded.";
      showNotice(refreshed ? confirmation : `${confirmation} The list has not refreshed yet.`);
    } catch (error) {
      showNotice(friendlyWalletError(error, action === "withdraw" ? "withdraw this BOT" : "cancel this stream"), true);
    } finally {
      setBusy(false);
    }
  }

  const visible = useMemo(() => streams.filter((stream) => {
    const done = stream.canceledAt > 0 || now >= stream.endTime;
    if (filter === "completed") return done;
    if (filter === "incoming") return !done && stream.recipient.toLowerCase() === address?.toLowerCase();
    return !done;
  }), [address, filter, now, streams]);

  const summary = useMemo(() => {
    let sent = 0n;
    let received = 0n;
    let active = 0;
    for (const stream of streams) {
      const done = stream.canceledAt > 0 || now >= stream.endTime;
      if (!done) active += 1;
      if (stream.sender.toLowerCase() === address?.toLowerCase()) sent += stream.deposit;
      if (stream.recipient.toLowerCase() === address?.toLowerCase()) received += stream.withdrawn;
    }
    return { sent, received, active };
  }, [address, now, streams]);

  if (status === "reconnecting") {
    return <div className="access-screen"><div className="access-card"><RefreshCw className="spin" /><h1>Checking your wallet</h1><p>This should only take a moment.</p></div></div>;
  }

  if (!isConnected || !address) {
    return (
      <div className="access-screen">
        <div className="access-card">
          <Logo />
          <span className="access-icon"><LockKeyhole /></span>
          <p className="section-index">WALLET REQUIRED</p>
          <h1>Connect before entering.</h1>
          <p>Your streams are read directly from BOT Chain, so the app needs a wallet address before it can load your account.</p>
          <WalletButton />
          <Link className="back-link" href="/"><ArrowLeft size={15} /> Back to home</Link>
        </div>
      </div>
    );
  }

  if (chainId !== botchainMainnet.id) {
    return (
      <div className="access-screen">
        <div className="access-card">
          <Logo />
          <p className="section-index">NETWORK REQUIRED</p>
          <h1>Switch to BOT Chain.</h1>
          <p>TipStream runs on BOT Chain mainnet (chain ID 677). Switch networks to load your real streams.</p>
          <WalletButton />
          <Link className="back-link" href="/"><ArrowLeft size={15} /> Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Logo />
        <p className="app-title">Payment streams</p>
        <div className="header-actions"><a className="mainnet-pill" href="https://scan.botchain.ai" target="_blank" rel="noreferrer"><span />BOT Mainnet<ExternalLink size={13} /></a><WalletButton /></div>
      </header>

      <main id="dashboard">
        <section className="app-intro">
          <div><p className="section-index">BOT CHAIN MAINNET · LIVE DATA</p><h1>Your payment streams.</h1><p>Create a schedule, track accrued BOT, and settle from your wallet.</p></div>
          <a className="contract-link" href={`https://scan.botchain.ai/address/${tipStreamAddress}`} target="_blank" rel="noreferrer">View contract <ExternalLink size={14} /></a>
        </section>

        {!isContractConfigured ? <div className="config-banner"><span>TipStream is temporarily unavailable because its contract configuration is missing.</span></div> : null}

        <section className="stats-grid" aria-label="Stream overview">
          <div className="stat-card"><span className="stat-icon teal"><ArrowUpRight /></span><div><p>Total sent</p><strong>{Number(formatEther(summary.sent)).toLocaleString(undefined, { maximumFractionDigits: 4 })} <small>BOT</small></strong></div></div>
          <div className="stat-card"><span className="stat-icon purple"><ArrowDownLeft /></span><div><p>Total withdrawn</p><strong>{Number(formatEther(summary.received)).toLocaleString(undefined, { maximumFractionDigits: 4 })} <small>BOT</small></strong></div></div>
          <div className="stat-card"><span className="stat-icon yellow"><Activity /></span><div><p>Active streams</p><strong>{summary.active.toString()}</strong></div></div>
        </section>

        <div className="content-grid">
          <CreateStream onSubmitted={onSubmitted} onNotice={showNotice} />
          <section className="streams-panel" id="activity">
            <div className="panel-header"><div><p className="eyebrow">Your payments</p><h2>Streams</h2></div><button className="icon-button" onClick={() => void loadStreams()} aria-label="Refresh streams"><RefreshCw size={17} className={loading ? "spin" : ""} /></button></div>
            <div className="tabs" role="tablist">
              <button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Active</button>
              <button className={filter === "incoming" ? "active" : ""} onClick={() => setFilter("incoming")}>Incoming</button>
              <button className={filter === "completed" ? "active" : ""} onClick={() => setFilter("completed")}>Completed</button>
            </div>
            <div className="stream-list">
              {loading ? <div className="empty-state"><RefreshCw className="spin" /><p>Reading the chain…</p></div> : null}
              {!loading && visible.map((stream) => <StreamCard key={stream.id.toString()} stream={stream} now={now} account={address as Address | undefined} busy={busy} onWithdraw={(id) => void streamAction("withdraw", id)} onCancel={(id) => void streamAction("cancel", id)} />)}
              {!loading && visible.length === 0 ? <div className="empty-state"><div className="empty-orbit"><Plus /></div><h3>No {filter} streams</h3><p>{address ? "Create a stream and watch value move in real time." : "Connect your wallet to see your payment streams."}</p></div> : null}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
      {notice ? <div className={`toast ${notice.error ? "error" : ""}`} role="status"><span>{notice.message}</span><button onClick={() => setNotice(null)} aria-label="Close notification"><X size={16} /></button></div> : null}
    </div>
  );
}
