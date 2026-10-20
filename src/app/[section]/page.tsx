import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
const pages: Record<string, { title: string; text: string }> = {
  explore: { title: 'Curiosity belongs here.', text: 'Explore the IDEA Lab and Fab Lab community at Model Engineering College. Sign in to discover projects, events and lab support as online services become available.' },
  lab: { title: 'Meet your making space.', text: 'IDEA Lab at Model Engineering College, Thrikkakara, Kochi. Contact the team for current facilities, visiting arrangements and safety requirements. Machine work is operated by the responsible Machine Head.' },
  projects: { title: 'Ideas grow together.', text: 'Project discovery and membership are available to signed-in members as these services come online. Public visitors can learn about the lab here.' },
  events: { title: 'Keep learning. Keep making.', text: 'Sign in for event information as online registration becomes available, or contact the lab team for the current programme.' },
};
export default async function PublicSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params; const page = pages[section]; if (!page) notFound();
  return <main id="main-content" className="section narrow"><Link className="text-link" href="/"><ArrowLeft size={18} /> IDEALAB MEC</Link><span className="eyebrow">MODEL ENGINEERING COLLEGE</span><h1>{page.title}</h1><p>{page.text}</p><div className="button-row"><Link className="button button-primary" href="/sign-in">Sign in <ArrowUpRight size={18} /></Link><a className="button" href="mailto:idealab@mec.ac.in">Contact the lab</a></div></main>;
}
