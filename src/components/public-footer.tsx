import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { AutomaticMotionControl } from '@/components/automatic-motion';
import { Brand } from '@/components/brand';

export function PublicFooter({ showReplay = false, showMotionControl = false }: { showReplay?: boolean; showMotionControl?: boolean }) {
  return <footer className="site-footer">
    <div className="container footer-top">
      <div><Brand /><p>For curious minds.<br />And the things they’ll make.</p></div>
      <div><h2>Find your way</h2><Link href="/lab">The lab</Link><Link href="/projects">Projects</Link><Link href="/events">Events</Link></div>
      <div><h2>Say hello</h2><a href="mailto:idealab@mec.ac.in">idealab@mec.ac.in <ArrowUpRight size={15} aria-hidden="true" /></a><p>Model Engineering College<br />Thrikkakara, Kochi<br />Kerala 682021</p></div>
      <Image className="college-logo" src="/brand/mec.png" width={76} height={84} alt="Model Engineering College crest" />
    </div>
    <div className="container footer-bottom">
      <span>IDEALAB MEC · Model Engineering College</span>
      {showMotionControl && <AutomaticMotionControl />}
      {showReplay && <a href="/?intro=replay">Replay animated intro</a>}
      <a href="https://idealab.mec.ac.in/">Official lab website <ArrowUpRight size={14} aria-hidden="true" /></a>
    </div>
  </footer>;
}
