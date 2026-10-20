import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className="brand" href="/" aria-label="IDEALAB MEC home">
    <span className="brand-emblem" aria-hidden="true"><Image src="/brand/idea-lab.png" width={48} height={48} alt="" /></span>
    <span className="brand-wordmark">IDEALAB <span>MEC</span>{!compact && <small>MODEL ENGINEERING COLLEGE</small>}</span>
  </Link>;
}
