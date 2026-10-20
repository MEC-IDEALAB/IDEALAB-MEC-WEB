import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, CircleArrowRight, Layers3, MoveUpRight, Sparkles, Wrench } from "lucide-react";
import { Brand } from "@/components/brand";
import { PublicHeader } from "@/components/public-header";
import { HomeMotion } from "@/components/home-motion";
import { DoodleStar, DoodleOrbit, DoodleTrail } from '@/components/doodles';
import { FacilityCards } from '@/components/facility-cards';
import { activities } from '@/content/lab';

const paths = [
  { n: "01", title: "Make something real.", text: "Explore the tools, understand the process and find the right support for your next idea.", href: "/lab", label: "Explore the lab", icon: Wrench, tone: "lime" },
  { n: "02", title: "Find your next project.", text: "Follow ideas as they take shape. Discover projects and connect your curiosity to practical work.", href: "/projects", label: "Discover projects", icon: Layers3, tone: "blue" },
  { n: "03", title: "Learn by showing up.", text: "Find lab events and opportunities to learn, experiment, and meet people who like making things too.", href: "/events", label: "Explore events", icon: CalendarDays, tone: "coral" },
];

function MakerIllustration() {
  return <div className="maker-art" aria-hidden="true">
    <span className="art-coordinate">MEC / IDEA LAB</span><span className="art-cross">+</span>
    <svg className="machine-drawing" viewBox="0 0 520 410" fill="none">
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
    <div className="art-note"><span className="note-dot" />FROM IDEA<br /><strong>TO REALITY.</strong><MoveUpRight size={28} /></div>
    <span className="art-sticker"><Sparkles size={20} /> Built on<br />curiosity.</span>
    <span className="art-bottom">THINK. EXPERIMENT. MAKE. REPEAT.</span>
  </div>;
}

export default function Home() {
  return <div className="playful-site"><PublicHeader /><HomeMotion /><main id="main-content">
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">Big ideas.<br />Real things.<br /><span className="hero-highlight">Your move.<svg viewBox="0 0 350 20" preserveAspectRatio="none" aria-hidden="true"><path d="M2 15C90 0 240 0 348 9" /></svg></span></h1>
        <p className="hero-description">A place for curious minds and hands-on making. Bring your next idea to life at Model Engineering College’s IDEA Lab.</p>
        <div className="hero-actions"><Link className="button button-primary" href="/explore">Find your starting point <ArrowUpRight size={20} aria-hidden="true" /></Link><Link className="text-link" href="/lab">Meet the lab <ArrowRight size={18} aria-hidden="true" /></Link></div>
      </div><div className="hero-art-wrap"><DoodleStar className="hero-star" /><MakerIllustration /><DoodleOrbit className="hero-orbit" /><span className="handwritten hero-scribble">a little curiosity goes a long way.</span></div>
    </section>
    <div className="principles-strip"><div className="container principles-inner"><span>IDEAS INTO ACTION</span><span aria-hidden="true">✳</span><span>LEARNING BY MAKING</span><span aria-hidden="true">✳</span><span>MADE AT MEC</span><span aria-hidden="true">✳</span></div></div>
    <section className="section container" aria-labelledby="possibilities-title"><div className="section-heading" data-reveal="section"><div><p className="eyebrow">A SPACE TO START</p><h2 id="possibilities-title">Less “what if”.<br />More “let’s try”.</h2></div><p>You don’t need to have it all figured out.<br className="desktop-break" /> Just find a good place to begin.</p></div>
      <div className="path-grid">{paths.map(({ n, title, text, href, label, icon: Icon, tone }) => <article className={`path-card tone-${tone}`} data-reveal="card" data-stagger={Number(n) - 1} key={n}><div className="card-topline"><span className="card-index">/ {n}</span><Icon size={26} strokeWidth={1.7} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p><Link href={href} className="card-link">{label}<CircleArrowRight size={24} strokeWidth={1.5} aria-hidden="true" /></Link></article>)}</div>
    </section>
    <section className="section container facilities-section" aria-labelledby="facilities-title"><div className="section-heading" data-reveal="section"><div><p className="eyebrow">TOOLS FOR YOUR WHAT-IF</p><h2 id="facilities-title">From a sketch<br />to something you can hold.</h2></div><Link className="text-link" href="/lab#facilities">Explore facilities <ArrowUpRight size={20} aria-hidden="true" /></Link></div><FacilityCards preview /><p className="source-caption">Facilities published by IDEA Lab. <a href="mailto:idealab@mec.ac.in">Contact the team</a> for access and operating arrangements.</p></section>
    <section className="journey-section" aria-labelledby="journey-title"><div className="container journey-grid"><div className="journey-intro" data-reveal="section"><p className="eyebrow">FROM PLAN TO PROTOTYPE</p><h2 id="journey-title">Your idea.<br />A clear next step.</h2><p>A work request starts the conversation. The lab team helps coordinate what comes next.</p><Link className="button" href="/sign-in">Start a work request <ArrowUpRight size={18} aria-hidden="true" /></Link></div><ol className="journey-steps" data-reveal="journey"><li><span>01</span><div><h3>Tell us what you have in mind.</h3><p>Sign in, choose the machine, and describe the work you need. Add your preferred date and time.</p></div></li><li><span>02</span><div><h3>The Machine Head confirms.</h3><p>Your preferred time is a request. The Machine Head reviews the details and confirms the arrangement.</p></div></li><li><span>03</span><div><h3>Let’s get making. Safely.</h3><p>Only the Machine Head operates the machine. Follow the confirmed instructions and track your request.</p></div></li></ol></div></section>
    <section className="section container about-section" aria-labelledby="about-title"><div className="about-mark" data-reveal="section" aria-hidden="true"><span>IDEA</span><span>LAB<span className="about-asterisk">✳</span></span><small>MODEL ENGINEERING COLLEGE</small></div><div className="about-copy" data-reveal="section"><p className="eyebrow">AICTE × COGNICOR × MEC</p><h2 id="about-title">A lab for the<br />way you think.</h2><p>Supported by AICTE and CogniCor, MEC’s IDEA Lab brings engineering, design and hands-on learning together. Workshops and training help students and faculty turn ideas into prototypes, explore STEM across disciplines and build practical skills.</p><Link className="text-link" href="/explore">Get to know IDEA Lab <ArrowUpRight size={18} aria-hidden="true" /></Link></div></section>
    <section className="section container activities-section" aria-labelledby="activities-title"><div className="section-heading" data-reveal="section"><div><p className="eyebrow">OUR ACTIVITIES</p><h2 id="activities-title">Learn by doing.<br />Then do a little more.</h2></div><p>Making, coding and sharing knowledge are part of the lab’s workshop and training history.</p></div><div className="activity-grid">{activities.map((activity, index) => <article className={`activity-card activity-${activity.tone}`} key={activity.category} data-reveal="card" data-stagger={index}><span className="eyebrow">{activity.category}</span><h3>{activity.title}</h3><p>{activity.description}</p></article>)}</div><Link className="text-link activity-link" href="/events">Explore learning opportunities <ArrowUpRight size={20} aria-hidden="true" /></Link></section>
    <section className="container final-cta" data-reveal="section"><DoodleTrail className="cta-trail" /><div><p className="eyebrow">THERE’S SOMETHING IN THAT IDEA.</p><h2>Give it a place to grow.</h2></div><Link className="button button-ink" href="/sign-in">Get started <ArrowUpRight size={20} aria-hidden="true" /></Link></section>
  </main><footer className="site-footer"><div className="container footer-top"><div><Brand /><p>For curious minds.<br />And the things they’ll make.</p></div><div><h2>Find your way</h2><Link href="/lab">The lab</Link><Link href="/projects">Projects</Link><Link href="/events">Events</Link></div><div><h2>Say hello</h2><a href="mailto:idealab@mec.ac.in">idealab@mec.ac.in <ArrowUpRight size={15} aria-hidden="true" /></a><p>Model Engineering College<br />Thrikkakara, Kochi<br />Kerala 682021</p></div><Image className="college-logo" src="/brand/mec.png" width={76} height={84} alt="Model Engineering College crest" /></div><div className="container footer-bottom"><span>IDEALAB MEC · Model Engineering College</span><a href="https://idealab.mec.ac.in/">Official lab website <ArrowUpRight size={14} aria-hidden="true" /></a></div></footer></div>;
}
