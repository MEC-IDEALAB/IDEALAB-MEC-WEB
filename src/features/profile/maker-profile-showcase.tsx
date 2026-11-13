import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  HeartHandshake,
  Plus,
} from 'lucide-react';
import { ProfileQrCard } from './profile-qr-card';
import { ProjectCards, ProjectsUnavailable } from '@/features/projects/project-surfaces';
import type { ProjectRead, ProjectList } from '@/features/projects/project-contract';
import { HomeMotion } from '@/components/home-motion';
import { ProfileSectionNavigation } from './profile-section-navigation';

export type ProfileShowcaseEntry = Readonly<{
  title: string;
  detail: string;
  meta?: string;
  kind?: string;
}>;

export type ProfileShowcaseProject = Readonly<{
  title: string;
  detail: string;
  status: string;
  accent: 'yellow' | 'blue' | 'pink';
}>;

type Props = {
  preview?: boolean;
  name: string;
  avatarUrl?: string | null;
  avatarAlt?: string;
  detail: string;
  bio?: string;
  interests?: string[];
  links?: ReadonlyArray<{ label: string; url: string }>;
  shareHref: string | null;
  editHref: string;
  projectRead?: ProjectRead<ProjectList>;
  sampleProjects?: ProfileShowcaseProject[];
  activity?: ProfileShowcaseEntry[];
  experience?: ProfileShowcaseEntry[];
  education?: ProfileShowcaseEntry[];
  volunteering?: ProfileShowcaseEntry[];
};

function GitHubMark() {
  return <svg width="23" height="23" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.33-3.8-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.71 2.62 1.22 3.26.93.1-.72.39-1.22.71-1.5-2.51-.29-5.15-1.26-5.15-5.6 0-1.24.44-2.25 1.16-3.05-.12-.28-.5-1.43.11-2.99 0 0 .94-.3 3.1 1.16a10.78 10.78 0 0 1 5.64 0c2.16-1.46 3.1-1.16 3.1-1.16.61 1.56.23 2.71.11 2.99.72.8 1.16 1.81 1.16 3.05 0 4.35-2.65 5.31-5.17 5.59.4.34.76 1.02.76 2.06v3.07c0 .3.2.65.77.54A11.25 11.25 0 0 0 12 .75Z" /></svg>;
}

function AddLink({ href, label = 'Add', disabled = false }: { href: string; label?: string; disabled?: boolean }) {
  return disabled
    ? <button className="maker-profile-add" type="button" disabled aria-label={`${label} is not available yet`}><Plus size={16} aria-hidden="true" /><span>{label}</span></button>
    : <Link className="maker-profile-add" href={href}><Plus size={16} aria-hidden="true" /><span>{label}</span></Link>;
}

function ShowcaseRows({ items, empty, preview }: { items: ProfileShowcaseEntry[]; empty: string; preview?: boolean }) {
  if (!items.length) return <p className="maker-profile-empty">{empty}</p>;
  return <ul className="maker-profile-rows">
    {items.map((item, index) => <li key={`${item.title}-${index}`}>
      <span className="maker-profile-row-icon" aria-hidden="true">{item.kind === 'education' ? <GraduationCap size={18} /> : item.kind === 'volunteer' ? <HeartHandshake size={18} /> : item.kind === 'activity' ? <CalendarDays size={18} /> : <BriefcaseBusiness size={18} />}</span>
      <span className="maker-profile-row-copy"><strong>{item.title}</strong><span>{item.detail}</span></span>
      {item.meta && <span className="maker-profile-row-meta">{item.meta}</span>}
      {preview && <span className="maker-profile-sample-tag">SAMPLE</span>}
    </li>)}
  </ul>;
}

function GitHubActivity({ preview, href }: { preview?: boolean; href?: string }) {
  const cells = preview ? Array.from({ length: 364 }, (_, index) => {
    // Deliberately deterministic and visibly marked as sample artwork in the design route.
    const sample = (index * 17 + Math.floor(index / 7) * 11 + (index % 19) * 5) % 13;
    const level = sample < 5 ? 0 : sample < 8 ? 1 : sample < 10 ? 2 : sample < 12 ? 3 : 4;
    return <span key={index} data-level={level} aria-hidden="true" />;
  }) : null;
  return <section className="maker-github-panel" aria-labelledby="maker-github-title" data-reveal="section">
    <div className="maker-github-heading">
      <span className="maker-github-mark"><GitHubMark /></span>
      <div><span className="maker-profile-kicker">AROUND THE WEB</span><h2 id="maker-github-title">GitHub activity</h2></div>
      {href ? <a className="maker-github-link" href={href} target="_blank" rel="noreferrer">View GitHub <ArrowUpRight size={15} aria-hidden="true" /></a>
        : preview ? <Link className="maker-github-link" href="/design/member-profile-edit#social-links">Add GitHub <ArrowUpRight size={15} aria-hidden="true" /></Link>
          : null}
    </div>
    {preview ? <>
      <div className="maker-github-grid maker-github-grid--sample" role="img" aria-label="Illustrative sample contribution grid; no GitHub account is connected.">{cells}</div>
      <div className="maker-github-footer"><span>SAMPLE CHART · NOT LIVE DATA</span><span className="maker-github-legend" aria-hidden="true"><i /><i /><i /><i /><i /></span></div>
    </> : <p className="maker-profile-empty">GitHub contribution history is currently unavailable.</p>}
  </section>;
}

function Chapter({ id, number, title, caption, href, children, addDisabled = false }: {
  id: string; number: string; title: string; caption: string; href: string; children: ReactNode; addDisabled?: boolean;
}) {
  return <section className="maker-profile-chapter" id={id} aria-labelledby={`${id}-title`} data-reveal="section">
    <header className="maker-profile-chapter-heading">
      <span className="maker-profile-chapter-number">{number}</span>
      <div className="maker-profile-chapter-title"><span className="maker-profile-kicker">MAKER LOG / {number}</span><h2 id={`${id}-title`}>{title}</h2><p>{caption}</p></div>
      <AddLink href={href} disabled={addDisabled} />
    </header>
    <div className="maker-profile-chapter-body">{children}</div>
  </section>;
}

export function MakerProfileShowcase({
  preview = false,
  name,
  avatarUrl,
  avatarAlt,
  detail,
  bio = '',
  interests = [],
  links = [],
  shareHref,
  editHref,
  projectRead,
  sampleProjects = [],
  activity = [],
  experience = [],
  education = [],
  volunteering = [],
}: Props) {
  const github = links.find(link => /github/i.test(link.label) || /github\.com/i.test(link.url));
  const cardPath = preview ? '/design/member-space?screen=profile' : shareHref;
  const visibleInterests = interests.length ? interests : [];

  return <div className="maker-profile">
    <HomeMotion />
    {preview && <p className="maker-profile-preview-note"><span>DESIGN PREVIEW</span> Sample portfolio content is illustrative. It is not member data.</p>}
    <div className="maker-profile-overview">
      <div className="maker-profile-identity-column">
        <ProfileQrCard path={cardPath} preview={preview} memberName={name} memberDetail={detail} memberBio={bio} memberAvatarUrl={avatarUrl} memberAvatarAlt={avatarAlt} />
        <Link className="maker-profile-edit-cta" href={editHref}>Edit profile <ArrowUpRight size={18} aria-hidden="true" /></Link>
        {links.length > 0 ? <nav className="maker-profile-links" aria-label="Public profile links">{links.map(link => <a key={`${link.label}:${link.url}`} href={link.url} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight size={14} aria-hidden="true" /></a>)}</nav>
          : <p className="maker-profile-links-empty">{preview ? 'Add GitHub, LinkedIn or portfolio links from Edit profile.' : 'Profile links are not connected yet.'}</p>}
      </div>
      <div className="maker-profile-side-column">
        <section className="maker-interest-panel" aria-labelledby="maker-interests-title" data-reveal="section">
          <header><div><span className="maker-profile-kicker">YOUR CURIOSITIES</span><h2 id="maker-interests-title">Interests</h2></div><AddLink href={`${editHref}#interests`} disabled={!preview} /></header>
          {visibleInterests.length ? <ul className="maker-interest-chips">{visibleInterests.map((interest, index) => <li key={`${interest}-${index}`}>{interest}</li>)}</ul>
            : <p className="maker-profile-empty">{preview ? 'Choose the technical and non-technical things you enjoy.' : 'Interest editing is not connected yet.'}</p>}
          <p className="maker-interest-footnote">Self-selected interests · not verified skills or machine permissions</p>
        </section>
        <GitHubActivity preview={preview} href={github?.url} />
      </div>
    </div>

    <ProfileSectionNavigation />

    <div className="maker-profile-chapters">
      <Chapter id="profile-activity" number="01" title="Activity" caption="Workshops, events and things you’ve taken part in." href={`${editHref}#activities`} addDisabled={!preview}>
        <ShowcaseRows items={activity} empty="Event attendance will appear here when it is connected to your member profile." preview={preview} />
        {!preview && <Link className="maker-profile-secondary-link" href="/app/events">Explore events <ArrowUpRight size={15} aria-hidden="true" /></Link>}
      </Chapter>
      <Chapter id="profile-projects" number="02" title="Projects" caption="Things you’re building, have built or contributed to." href={preview ? '/design/member-profile-edit#projects' : '/app/projects/new'} addDisabled={!preview && (!projectRead || projectRead.status !== 'ready')}>
        {preview ? <div className="maker-profile-sample-projects">{sampleProjects.map((project, index) => <article className={`maker-sample-project maker-sample-project--${project.accent}`} key={`${project.title}-${index}`}><span className="maker-sample-project-art" aria-hidden="true"><svg viewBox="0 0 120 120" focusable="false">{index % 2 === 0 ? <><path d="M60 10 98 31v50l-38 22-38-22V31z" fill="#111"/><path d="m60 18 31 18v40l-31 18-31-18V36z" fill="#ffe029"/><path d="m60 28 18 10v22L60 70 42 60V38z" fill="#111"/><path d="M47 42h7v7h-7zm19 0h7v7h-7zM51 56h18v6H51z" fill="#315dff"/><path d="M16 34h10v6H16zm78 37h12v6H94zM53 98h14v8H53z" fill="#ff3994"/></> : <><path d="M23 37h18V21h38v16h18v43H81v18H39V80H23z" fill="#111"/><path d="M34 42h52v31H34z" fill="#f7f5ec"/><path d="M45 49h9v10h-9zm21 0h9v10h-9z" fill="#315dff"/><path d="M48 64h23v6H48z" fill="#ff3994"/><path d="M31 84h58v9H31zM17 51h11v7H17zm75 9h12v7H92z" fill="#ffe029"/></>}</svg></span><div><span className="maker-profile-kicker">SAMPLE PROJECT / {project.status}</span><h3>{project.title}</h3><p>{project.detail}</p></div></article>)}</div>
          : projectRead?.status === 'unavailable' ? <ProjectsUnavailable />
            : !projectRead ? <p className="maker-profile-empty">Project membership is not connected in this environment.</p>
            : projectRead.data.items.length ? <ProjectCards items={projectRead.data.items.slice(0, 4)} />
              : <p className="maker-profile-empty">Your project memberships will show here. Start a project or join a team to add one.</p>}
      </Chapter>
      <Chapter id="profile-experience" number="03" title="Experience" caption="Internships, work, hackathons and other experience." href={`${editHref}#work-experience`} addDisabled={!preview}>
        <ShowcaseRows items={experience} empty="Add the work, internships or builds you want people to know about." preview={preview} />
      </Chapter>
      <Chapter id="profile-education" number="04" title="Education" caption="Your academic journey." href={`${editHref}#education`} addDisabled={!preview}>
        {preview ? <ShowcaseRows items={education} empty="" preview /> : <ul className="maker-profile-rows"><li><span className="maker-profile-row-icon" aria-hidden="true"><GraduationCap size={18} /></span><span className="maker-profile-row-copy"><strong>{detail.split(' · ')[0] || 'Model Engineering College'}</strong><span>{[detail.split(' · ').slice(1).join(' · '), 'MEC account detail'].filter(Boolean).join(' · ')}</span></span><Link className="maker-row-edit" href={`${editHref}#basic-profile`}>Edit</Link></li></ul>}
        <p className="maker-profile-empty maker-profile-empty--subtle">Additional education history can be added from the profile editor when its save connection is enabled.</p>
      </Chapter>
      <Chapter id="profile-volunteering" number="05" title="Volunteering" caption="Communities and causes you contribute to." href={`${editHref}#volunteering`} addDisabled={!preview}>
        <ShowcaseRows items={volunteering} empty="Show the groups, causes or community work you’ve supported." preview={preview} />
      </Chapter>
    </div>
  </div>;
}
