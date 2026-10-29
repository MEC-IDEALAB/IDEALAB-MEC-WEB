import Image from "next/image";

export function MakerPhotoPoster() {
  return <div className="maker-art" role="img" aria-label="Snapmaker A350T, a modular machine for 3D printing, laser engraving and CNC work">
    <span className="art-coordinate" aria-hidden="true">MEC / IDEA LAB</span><span className="art-cross" aria-hidden="true">+</span>
    <figure className="hero-machine-photo" aria-hidden="true">
      <span className="hero-machine-photo-label">MACHINE 01 / SNAPMAKER</span>
      <Image className="hero-machine-photo-image" src="/facilities/snapmaker.png" width={240} height={240} sizes="(max-width: 600px) 230px, (max-width: 1000px) 220px, 260px" alt="" priority />
      <figcaption><strong>Snapmaker A350T</strong><span>3D PRINTING · LASER · CNC</span></figcaption>
    </figure>
    <div className="art-note" aria-hidden="true"><span className="note-dot" />FROM IDEA<br /><strong>TO REALITY.</strong><span className="note-arrow">↗</span></div>
    <span className="art-sticker" aria-hidden="true"><span>✳</span> Built on<br />curiosity.</span>
    <span className="art-bottom" aria-hidden="true">THINK. EXPERIMENT. MAKE. REPEAT.</span>
  </div>;
}
