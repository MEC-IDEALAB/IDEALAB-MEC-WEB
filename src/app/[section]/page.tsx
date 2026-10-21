import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { FacilityCards } from '@/components/facility-cards';
import { activities } from '@/content/lab';
const pages: Record<string, { title: string; text: string }> = {
  explore: { title: 'Curiosity belongs here.', text: 'Supported by AICTE and CogniCor, IDEA Lab at Model Engineering College brings practical STEM learning, multidisciplinary collaboration and prototyping together.' },
  lab: { title: 'Meet your making space.', text: 'IDEA Lab at Model Engineering College, Thrikkakara, Kochi. Contact the team for current facilities, visiting arrangements and safety requirements. Machine work is operated by the responsible Machine Head.' },
  projects: { title: 'Ideas grow together.', text: 'Project discovery and membership are available to signed-in members as these services come online. Public visitors can learn about the lab here.' },
  events: { title: 'Keep learning. Keep making.', text: 'Sign in for event information as online registration becomes available, or contact the lab team for the current programme.' },
};
export default async function PublicSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params; const page = pages[section]; if (!page) notFound();
  return <div className="playful-site"><PublicHeader /><main id="main-content" className={`section ${section === 'lab' ? 'container lab-directory' : 'narrow'}`}><Link className="text-link" href="/"><ArrowLeft size={18} aria-hidden="true" /> IDEALAB MEC</Link><span className="eyebrow">MODEL ENGINEERING COLLEGE</span><h1>{page.title}</h1><p className="public-intro">{page.text}</p>
    {section === 'explore' && <section className="institution-story" aria-labelledby="institution-title"><h2 id="institution-title">Engage. Explore.<br />Experience. Express. Excel.</h2><p>MEC was selected for the AICTE IDEA Lab programme in March 2022. Joint support from AICTE and CogniCor helps connect engineering education with practical skills and ideas that respond to real needs.</p><p>The lab’s workshops and training encourage students and faculty to collaborate across disciplines, develop prototypes and explore entrepreneurship.</p><Link className="text-link" href="/lab#facilities">Discover the facilities <ArrowUpRight size={18} aria-hidden="true" /></Link><div className="institution-links"><a href="https://www.mec.ac.in/">Model Engineering College</a><a href="https://idealab.mec.ac.in/">Official IDEA Lab website</a></div></section>}
    {section === 'lab' && <section id="facilities" className="directory-section" aria-labelledby="directory-title"><div className="section-heading"><div><p className="eyebrow">PUBLISHED FACILITIES</p><h2 id="directory-title">Meet the tools.</h2></div><p>Explore the equipment and software listed by the lab. Ask the team about current access, materials and training.</p></div><FacilityCards /><p className="source-caption">Institutional facility information supplied from the <a href="https://idealab.mec.ac.in/">official IDEA Lab website</a>. This directory does not show live availability or reserve equipment.</p></section>}
    {section === 'events' && <section className="learning-themes" aria-labelledby="learning-title"><h2 id="learning-title">A culture of hands-on learning.</h2><ul>{activities.map(activity => <li key={activity.category}><h3>{activity.category}</h3><p>{activity.description}</p></li>)}</ul><p className="small-copy">These themes reflect the lab’s past activities. Event records and registration belong in the signed-in platform.</p></section>}
    <div className="button-row"><Link className="button button-primary" href="/sign-in">Sign in <ArrowUpRight size={18} aria-hidden="true" /></Link><a className="button" href="mailto:idealab@mec.ac.in">Contact the lab</a></div></main></div>;
}
