"use client";

import { ArrowDownToLine, Ban, CheckCircle2, Clock3 } from "lucide-react";
import { formatEther } from "viem";
import type { Address } from "viem";
import type { Stream } from "@/lib/contract";

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
const amount = (value: bigint) => Number(formatEther(value)).toLocaleString(undefined, { maximumFractionDigits: 5 });

type Props = {
  stream: Stream;
  now: number;
  account?: Address;
  busy: boolean;
  onWithdraw: (id: bigint) => void;
  onCancel: (id: bigint) => void;
};

export function StreamCard({ stream, now, account, busy, onWithdraw, onCancel }: Props) {
  const effectiveNow = stream.canceledAt || Math.min(now, stream.endTime);
  const elapsed = Math.max(0, effectiveNow - stream.startTime);
  const duration = stream.endTime - stream.startTime;
  const progress = duration ? Math.min(100, (elapsed / duration) * 100) : 0;
  const streamed = (stream.deposit * BigInt(elapsed)) / BigInt(duration || 1);
  const available = streamed > stream.withdrawn ? streamed - stream.withdrawn : 0n;
  const canceled = stream.canceledAt > 0;
  const completed = now >= stream.endTime || canceled;
  const isRecipient = account?.toLowerCase() === stream.recipient.toLowerCase();
  const isSender = account?.toLowerCase() === stream.sender.toLowerCase();
  const remaining = Math.max(0, stream.endTime - now);
  const remainingLabel = remaining >= 3_600 ? `${Math.ceil(remaining / 3_600)}h left` : `${Math.ceil(remaining / 60)}m left`;

  return (
    <article className="stream-card">
      <div className="stream-top">
        <div className={`status-icon ${completed ? "done" : ""}`}>{completed ? <CheckCircle2 size={20} /> : <span className="pulse" />}</div>
        <div className="stream-party"><span>{isSender ? "To" : "From"}</span><strong>{short(isSender ? stream.recipient : stream.sender)}</strong></div>
        <span className={`status-pill ${canceled ? "canceled" : completed ? "completed" : "active"}`}>{canceled ? "Canceled" : completed ? "Completed" : "Streaming"}</span>
      </div>
      <div className="stream-amount"><strong>{amount(streamed)} <small>BOT</small></strong><span>of {amount(stream.deposit)} BOT</span></div>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      <div className="stream-meta">
        <span><Clock3 size={14} />{completed ? "Stream ended" : remainingLabel}</span>
        <span>{progress.toFixed(1)}%</span>
      </div>
      {(isRecipient && available > 0n) || (isSender && !completed) ? (
        <div className="stream-actions">
          {isRecipient && available > 0n ? <button onClick={() => onWithdraw(stream.id)} disabled={busy}><ArrowDownToLine size={15} /> Withdraw {amount(available)} BOT</button> : null}
          {isSender && !completed ? <button className="danger" onClick={() => onCancel(stream.id)} disabled={busy}><Ban size={15} /> Cancel</button> : null}
        </div>
      ) : null}
    </article>
  );
}
