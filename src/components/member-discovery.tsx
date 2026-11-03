'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight, BookOpen, HeartHandshake, Mail } from 'lucide-react';
import { AutomaticMotionControl } from '@/components/automatic-motion';
import { HomeTickerTop, HomeTickerBottom } from '@/components/home-ticker-bands';
import { AuthAscii } from '@/components/auth-ascii';
import { FeaturedActivitiesCarousel } from '@/components/featured-activities-carousel';

/** Editorial Home shared with the no-data preview; private panels arrive as server-rendered slots. */
export function MemberDiscovery({ name, children, labSnapshot }: { name?: string; children?: ReactNode; labSnapshot?: ReactNode }) {
  return <div className="member-discovery">
    <div className="discovery-landing-band playful-site"><HomeTickerTop /></div>
    <header className="discovery-hero">
      <div className="discovery-hello"><p className="discovery-greeting">Hello, {name || 'maker'}.</p><h1>A little curious?<br /><span>Good. Start here.</span></h1><p>Ideas, experiments and people to learn with. Find a spark, ask a question, make your next move.</p><div className="discovery-hero-links"><a className="button button-primary" href="#discover-activities">Find your spark <ArrowUpRight size={18} aria-hidden="true" /></a><Link className="text-link" href="/app/lab">Go to your lab <ArrowUpRight size={18} aria-hidden="true" /></Link></div></div>
      <div className="discovery-art"><div className="discovery-art-toolbar" aria-hidden="true"><span>CURIOUS_MINDS.EXE</span><span>+ − ×</span></div><AuthAscii /><div className="discovery-art-caption"><span aria-hidden="true">[ IDEA → OBJECT ]</span><span>One question can open a world.</span></div><span className="discovery-art-sticker" aria-hidden="true">MAKE<br />SOMETHING.</span></div>
    </header>
    <section id="discover-activities" aria-labelledby="discovery-activities-title">
      <div className="discovery-heading"><div><span className="discovery-label">01 / FIND A STARTING POINT</span><h2 id="discovery-activities-title">Pick a curiosity.</h2></div><p>Published learning themes.<br />Bring your own questions.</p></div>
      <FeaturedActivitiesCarousel />
    </section>
    <section className="discovery-learning" aria-labelledby="discovery-learning-title">
      <div className="discovery-learning-intro"><span className="discovery-label">02 / LESS GUESSING. MORE LEARNING.</span><h2 id="discovery-learning-title">You don’t have to<br /><em>figure it out alone.</em></h2><p>Start with what you want to learn. Ask the lab team about guidance, workshops or the right tool for your idea.</p><span className="discovery-learning-stamp" aria-hidden="true">ASK.<br />TRY.<br />REPEAT.</span></div>
      <div className="discovery-learning-links"><article><HeartHandshake size={24} aria-hidden="true" /><div><h3>Mentorship & support</h3><p>Tell the team about your idea and the guidance you’re looking for.</p><a className="text-link" href="mailto:idealab@mec.ac.in?subject=Mentorship%20and%20learning%20support">Email a guidance request <ArrowUpRight size={17} aria-hidden="true" /></a><small>Opens your email app. No mentor or session is booked.</small></div></article><article><BookOpen size={24} aria-hidden="true" /><div><h3>Learning & knowledge</h3><p>Explore the published equipment guide and recorded programme to find a starting point.</p><div className="discovery-inline-links"><Link className="text-link" href="/lab#facilities">Equipment guide <ArrowUpRight size={16} aria-hidden="true" /></Link><Link className="text-link" href="/app/events">Programme <ArrowUpRight size={16} aria-hidden="true" /></Link></div></div></article></div>
    </section>
    {children && <div className="discovery-member-stream">{children}</div>}
    <section className="discovery-directory" aria-labelledby="discovery-directory-title"><div className="discovery-directory-title"><span className="discovery-label">03 / KNOW YOUR SPACE</span><h2 id="discovery-directory-title">Big tools.<br />Open minds.</h2><p>Engineering, design and hands-on learning at Model Engineering College, supported by AICTE and CogniCor.</p></div><div className="discovery-directory-links"><Link href="/explore"><span><strong>About IDEA Lab</strong><small>The story & community</small></span><ArrowUpRight size={20} aria-hidden="true" /></Link><Link href="/lab#facilities"><span><strong>Facilities & equipment</strong><small>The published making-space guide</small></span><ArrowUpRight size={20} aria-hidden="true" /></Link><a href="mailto:idealab@mec.ac.in?subject=Lab%20visit%20and%20safety%20guidance"><span><strong>Plan a safe visit</strong><small>Email for zones, access & safety guidance</small></span><ArrowUpRight size={20} aria-hidden="true" /></a><a href="mailto:idealab@mec.ac.in?subject=Meet%20the%20IDEA%20Lab%20team"><span><strong>Meet the lab team</strong><small>Ask the team for an introduction by email</small></span><ArrowUpRight size={20} aria-hidden="true" /></a></div></section>
    {labSnapshot && <details className="discovery-snapshot"><summary>Your lab snapshot <span>Opening state & your visits</span></summary><div>{labSnapshot}<Link className="text-link" href="/app/lab">Open your Lab workspace <ArrowUpRight size={18} aria-hidden="true" /></Link></div></details>}
    <section className="discovery-support" aria-labelledby="discovery-support-title"><HeartHandshake size={35} aria-hidden="true" /><div><span className="discovery-label">PASS THE CURIOSITY ON</span><h2 id="discovery-support-title">A little support. More possibilities.</h2><p>Want to share your time, knowledge or support for the space? Start a conversation with the lab team.</p><p className="discovery-support-note">Online donations are not connected. Contact the team for approved ways to contribute.</p></div><a className="button" href="mailto:idealab@mec.ac.in?subject=Support%20IDEA%20Lab"><Mail size={18} aria-hidden="true" /> Email the team</a></section>
    <div className="discovery-landing-band playful-site"><HomeTickerBottom /></div>
    <footer className="discovery-motion-footer"><AutomaticMotionControl /><p id="automatic-motion-description" className="small-copy">Motion follows your device preference. Pause or resume the moving bands here.</p></footer>
  </div>;
}
