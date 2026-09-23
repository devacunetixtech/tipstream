import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link className="logo" href={href} aria-label="TipStream home">
      <Image src="/tipstream-logo.png" width={34} height={34} alt="" priority />
      <span>TipStream</span>
    </Link>
  );
}
