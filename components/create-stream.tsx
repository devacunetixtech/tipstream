"use client";

import { ArrowRight, Clock3, Send, WalletCards } from "lucide-react";
import { FormEvent, useState } from "react";
import { isAddress, parseEther } from "viem";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import { isContractConfigured, tipStreamAbi, tipStreamAddress } from "@/lib/contract";
import { friendlyWalletError } from "@/lib/errors";
import { botchainMainnet } from "@/lib/wagmi";

const units = { minutes: 60, hours: 3_600, days: 86_400 } as const;

type Props = { onSubmitted: (hash: `0x${string}`) => Promise<void>; onNotice: (message: string, error?: boolean) => void };

export function CreateStream({ onSubmitted, onNotice }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending } = useWriteContract();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("2");
  const [unit, setUnit] = useState<keyof typeof units>("hours");

  const durationSeconds = Math.floor(Number(duration) * units[unit]);
  const rate = Number(amount) > 0 && durationSeconds > 0 ? Number(amount) / (durationSeconds / 3_600) : 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConnected) return onNotice("Connect your wallet to create a stream.", true);
    if (chainId !== botchainMainnet.id) return onNotice("Switch your wallet to BOT Chain before creating a stream.", true);
    if (!isContractConfigured) return onNotice("TipStream is temporarily unavailable while its contract configuration is restored.", true);
    if (!isAddress(recipient)) return onNotice("Enter a valid recipient address.", true);
    if (recipient.toLowerCase() === address?.toLowerCase()) return onNotice("Choose a recipient wallet other than your own.", true);
    if (!(Number(amount) > 0)) return onNotice("Amount must be greater than zero.", true);
    if (durationSeconds < 60 || durationSeconds > 365 * 86_400) return onNotice("Duration must be between 1 minute and 365 days.", true);

    try {
      const hash = await writeContractAsync({
        address: tipStreamAddress,
        abi: tipStreamAbi,
        functionName: "createStream",
        args: [recipient, durationSeconds],
        value: parseEther(amount),
      });
      onNotice("Transaction submitted. Waiting for confirmation…");
      await onSubmitted(hash);
      setRecipient("");
      setAmount("");
    } catch (error) {
      onNotice(friendlyWalletError(error, "create this stream"), true);
    }
  }

  return (
    <section className="create-card">
      <div className="card-heading">
        <div className="heading-icon"><Send size={20} /></div>
        <div><p className="eyebrow">New payment</p><h2>Create a stream</h2></div>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="recipient">Recipient wallet</label>
        <div className="input-shell"><WalletCards size={18} /><input id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} placeholder="0x…" autoComplete="off" spellCheck={false} required /></div>

        <label htmlFor="amount">Total amount</label>
        <div className="input-shell amount-input"><input id="amount" type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required /><span>BOT</span></div>

        <label htmlFor="duration">Stream duration</label>
        <div className="duration-row">
          <div className="input-shell"><Clock3 size={18} /><input id="duration" type="number" min="1" step="any" inputMode="decimal" value={duration} onChange={(e) => setDuration(e.target.value)} required /></div>
          <select value={unit} onChange={(e) => setUnit(e.target.value as keyof typeof units)} aria-label="Duration unit">
            <option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option>
          </select>
        </div>

        <div className="rate-preview"><span>Streaming rate</span><strong>{rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} BOT / hour</strong></div>
        <button className="primary-button" type="submit" disabled={isPending}>
          {isPending ? "Confirm in wallet…" : "Start streaming"}<ArrowRight size={18} />
        </button>
        <p className="form-note">BOT is escrowed securely and unlocks every second.</p>
      </form>
    </section>
  );
}
