import { useId } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { PublicProfile } from './public-profile-contract';

type PublicContent = Pick<PublicProfile, 'display_name' | 'bio' | 'interests' | 'skills' | 'links'>;

export function PublicProfileContent({ profile, preview = false }: { profile: PublicContent; preview?: boolean }) {
  const Heading = preview ? 'h3' : 'h1';
  const SectionHeading = preview ? 'h4' : 'h2';
  const prefix = useId();
  return <article className="public-member-profile-card"><span className="workspace-pixel-label">A CURIOUS MIND / MEC</span><Heading>{profile.display_name || 'Lab member'}</Heading>
      {profile.bio && <p>{profile.bio}</p>}
      {profile.interests.length > 0 && <section aria-labelledby={prefix + "-interests"}><SectionHeading id={prefix + "-interests"}>Interests</SectionHeading><p>Self-selected interests, not verified awards or machine permissions.</p><ul className="public-member-tags">{profile.interests.map(item => <li key={item}>{item}</li>)}</ul></section>}
      {profile.skills.length > 0 && <section aria-labelledby={prefix + "-skills"}><SectionHeading id={prefix + "-skills"}>Skills</SectionHeading><p>Described by this member.</p><ul className="public-member-tags">{profile.skills.map(item => <li key={item}>{item}</li>)}</ul></section>}
      {profile.links.length > 0 && <section aria-labelledby={prefix + "-links"}><SectionHeading id={prefix + "-links"}>Around the web</SectionHeading><ul className="public-member-links">{profile.links.map((link, index) => <li key={index}><a href={link.url} rel="nofollow noreferrer noopener" target="_blank">{link.label}<ArrowUpRight size={18} aria-hidden="true" /><span className="sr-only">Opens in a new tab</span></a></li>)}</ul></section>}
    </article>;
}
