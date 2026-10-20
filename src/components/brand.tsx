import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className="brand" href="/" aria-label="IDEALAB MEC home">
    <span className="brand-emblem" aria-hidden="true"><Image src="/brand/idea-lab.png" width={48} height={48} alt="" /></span>
    <span className="brand-wordmark"><span className="brand-name">IDEA<span className="brand-lab">LAB</span><span className="brand-campus">MEC</span></span>{!compact && <small>MODEL ENGINEERING COLLEGE</small>}</span>
  </Link>;
}
