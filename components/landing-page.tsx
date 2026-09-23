"use client";

import { ArrowRight, Check, Clock3, LockKeyhole, MoveRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { Logo } from "./logo";
import { SiteFooter } from "./site-footer";
import { WalletButton } from "./wallet-button";

export function LandingPage() {
  const router = useRouter();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (isConnected) router.prefetch("/app");
  }, [isConnected, router]);

  return (
    <div className="site-shell">
      <header className="landing-header">
        <Logo />
        <nav aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="https://scan.bohr.life" target="_blank" rel="noreferrer">Testnet explorer</a>
        </nav>
        {isConnected ? (
          <Link className="header-cta" href="/app">Open app <ArrowRight size={16} /></Link>
        ) : (
          <WalletButton onConnected={() => router.push("/app")} />
        )}
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="kicker"><span /> Live on BOT Chain testnet</p>
            <h1>Send BOT.<br />Let time do<br />the rest.</h1>
            <p className="hero-lede">TipStream releases a payment every second. The recipient withdraws what has accrued; you keep control of what has not.</p>
            <div className="hero-actions">
              {isConnected ? (
                <Link className="primary-link" href="/app">Open the app <ArrowRight size={18} /></Link>
              ) : (
                <WalletButton label="Connect wallet to start" onConnected={() => router.push("/app")} />
              )}
              <a className="text-link" href="#how-it-works">See how it works <MoveRight size={16} /></a>
            </div>
            <p className="access-note"><LockKeyhole size={14} /> The app opens only after your wallet is connected.</p>
          </div>

          <div className="stream-demo" aria-label="Illustration of a continuous BOT payment">
            <div className="demo-label"><span>Payment stream</span><strong>LIVE</strong></div>
            <div className="demo-amount">24.80 <small>BOT</small></div>
            <div className="demo-rule"><span /></div>
            <div className="demo-parties"><span>You</span><MoveRight /><span>Recipient</span></div>
            <div className="demo-footer"><Clock3 size={15} /><span>Settling every second</span></div>
          </div>
        </section>

        <section className="principles" id="how-it-works">
          <div className="section-heading">
            <p className="section-index">01 / HOW IT WORKS</p>
            <h2>A payment schedule,<br />not another subscription.</h2>
          </div>
          <ol className="steps">
            <li><span>01</span><div><h3>Choose who and how much</h3><p>Enter a BOT Chain address, the total BOT amount, and a duration.</p></div></li>
            <li><span>02</span><div><h3>Approve one transaction</h3><p>Your BOT is held by the TipStream contract and begins accruing immediately.</p></div></li>
            <li><span>03</span><div><h3>Settle on your terms</h3><p>The recipient withdraws accrued BOT. The sender can cancel and recover the remainder.</p></div></li>
          </ol>
        </section>

        <section className="contract-facts">
          <p className="section-index">02 / ONCHAIN BY DEFAULT</p>
          <div className="facts-grid">
            <article><Check size={18} /><h3>Direct wallet approval</h3><p>No custodial account and no private key leaves your wallet.</p></article>
            <article><Check size={18} /><h3>Contract-enforced timing</h3><p>Accrual is calculated from BOT Chain block timestamps.</p></article>
            <article><Check size={18} /><h3>Publicly verifiable</h3><p>Every create, withdraw, and cancel transaction is visible on the explorer.</p></article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
