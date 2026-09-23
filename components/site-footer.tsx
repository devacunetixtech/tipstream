import { ArrowUpRight } from "lucide-react";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Logo />
        <p>Continuous native-token payments on BOT Chain.</p>
      </div>
      <div className="ecosystem-links" aria-label="BOT Chain ecosystem links">
        <span>Built on BOT Chain</span>
        <a href="https://botchain.ai" target="_blank" rel="noreferrer">
          botchain.ai <ArrowUpRight size={13} />
        </a>
        <a href="https://scan.botchain.ai" target="_blank" rel="noreferrer">
          scan.botchain.ai <ArrowUpRight size={13} />
        </a>
      </div>
    </footer>
  );
}
