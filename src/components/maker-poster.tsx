import Image from "next/image";
import { MoveUpRight, Sparkles } from "lucide-react";

export function MakerIllustration() {
  return <div className="maker-art" role="img" aria-label="IDEA Lab maker poster with a Snapmaker A350T and an original 3D-printer illustration">
    <span className="art-coordinate" aria-hidden="true">MEC / IDEA LAB</span><span className="art-cross" aria-hidden="true">+</span>
    <svg className="machine-drawing" viewBox="0 0 520 410" fill="none" aria-hidden="true" focusable="false">
      <path d="M76 296 261 190 450 297 264 405 76 296Z" fill="var(--accent-lavender)" stroke="var(--accent-ink)" strokeWidth="3" />
      <path d="M76 296V313L264 421V405M264 421 450 313V297" stroke="var(--accent-ink)" strokeWidth="3" transform="translate(0 -15)" />
      <path d="M113 280V111L281 16 419 96V267" stroke="var(--accent-ink)" strokeWidth="28" strokeLinejoin="round" />
      <path d="M113 280V111L281 16 419 96V267" stroke="var(--art-paper)" strokeWidth="20" strokeLinejoin="round" />
      <path d="M113 111 251 191 419 96M251 191V357" stroke="var(--accent-ink)" strokeWidth="28" strokeLinejoin="round" />
      <path d="M113 111 251 191 419 96M251 191V357" stroke="var(--art-paper)" strokeWidth="20" strokeLinejoin="round" />
      <path d="M132 267 279 183 401 253 253 338 132 267Z" fill="var(--accent-ink)" stroke="var(--accent-ink)" strokeWidth="3" />
      <path d="m148 264 130-75 108 62-132 76-106-63Z" fill="var(--art-neutral)" stroke="var(--accent-ink)" strokeWidth="3" />
      <path d="m249 258 40-23 39 23-40 23-39-23Z" fill="var(--accent-apricot)" stroke="var(--accent-ink)" strokeWidth="3" /><path d="M249 258v30l39 23 40-23v-30l-40 23-39-23Z" fill="var(--accent-apricot)" stroke="var(--accent-ink)" strokeWidth="3" /><path d="M288 281v30" stroke="var(--accent-ink)" strokeWidth="3" />
      <path d="m175 113 106-60 75 43-106 61-75-44Z" fill="var(--accent-lavender)" stroke="var(--accent-ink)" strokeWidth="3" />
      <path d="M280 110v73" stroke="var(--accent-ink)" strokeWidth="9" /><path d="m261 142 20-12 20 12v26l-20 12-20-12v-26Z" fill="var(--accent-amber)" stroke="var(--accent-ink)" strokeWidth="3" /><path d="m273 176 8 18 8-18" fill="var(--accent-ink)" />
      <path d="m146 288 27 16M179 308l16 9M379 292l-27 16" stroke="var(--accent-ink)" strokeWidth="3" />
      <circle cx="370" cy="182" r="25" fill="var(--accent-amber)" stroke="var(--accent-ink)" strokeWidth="3" /><path d="M359 182h22M370 171v22" stroke="var(--accent-ink)" strokeWidth="3" />
    </svg>
    <figure className="hero-object-study" aria-hidden="true">
      <span className="object-study-label">OBJECT STUDY / 01</span>
      <Image src="/facilities/snapmaker.png" width={200} height={200} sizes="(max-width: 600px) 112px, 150px" alt="" priority />
      <figcaption><strong>Snapmaker A350T</strong><span>PRINT · LASER · CNC</span></figcaption>
    </figure>
    <div className="art-note" aria-hidden="true"><span className="note-dot" />FROM IDEA<br /><strong>TO REALITY.</strong><MoveUpRight size={28} /></div>
    <span className="art-sticker" aria-hidden="true"><Sparkles size={20} /> Built on<br />curiosity.</span>
    <span className="art-bottom" aria-hidden="true">THINK. EXPERIMENT. MAKE. REPEAT.</span>
  </div>;
}
