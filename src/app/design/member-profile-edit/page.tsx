import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { MemberWorkspaceShell } from '@/components/member-workspace-shell';
import { ProfileWorkspaceHeader } from '@/components/workspace-arcade';
import { PublicProfileEditor } from '@/features/profile/public-profile-editor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profile editor visual preview', robots: { index: false, follow: false } };

function PreviewSection({ id, number, title, message }: { id: string; number: string; title: string; message: string }) {
  return <section id={id} className="profile-edit-section" aria-labelledby={`${id}-preview-title`}>
    <div className="profile-edit-section-heading"><div><span className="workspace-pixel-label">{number} / PROFILE</span><h2 id={`${id}-preview-title`}>{title}</h2></div><span className="profile-edit-status profile-edit-status--offline">Not connected</span></div>
    <div className="profile-edit-next-step"><p>{message}</p></div>
  </section>;
}

export default function MemberProfileEditPreview() {
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();
  return <MemberWorkspaceShell variant="preview" previewPath="/design/member-space" activeScreen="profile" activeLabel="Profile visual preview">
    <div className="workspace-page workspace-arcade-profile profile-edit-page">
      <ProfileWorkspaceHeader settingsHref="/design/member-settings" profileEditHref="/design/member-profile-edit" shareHref="/design/member-space?screen=profile" />
      <div className="profile-edit-page-heading">
        <div><span className="workspace-pixel-label">IDEALAB MEC / PROFILE EDITOR</span><h2>Edit your profile</h2><p>Preview of the profile steps. Sample values stay in this page and are never saved.</p></div>
        <Link className="text-link" href="/design/member-space?screen=profile"><ArrowLeft size={17} aria-hidden="true" /> Profile</Link>
      </div>

      <nav className="profile-edit-section-nav" aria-label="Profile preview sections">
        <a href="#basic-profile"><span>01</span>Basic profile</a><a href="#social-links"><span>02</span>Social links</a>
        <a href="#profile-settings"><span>03</span>Profile settings</a><a href="#projects"><span>04</span>Projects</a>
        <a href="#activities"><span>05</span>Activity</a><a href="#work-experience"><span>06</span>Work experience</a>
        <a href="#education"><span>07</span>Education</a><a href="#volunteering"><span>08</span>Volunteering</a><a href="#interests"><span>09</span>Interests</a>
      </nav>

      <section id="basic-profile" className="profile-edit-section" aria-labelledby="basic-profile-preview-title">
        <div className="profile-edit-section-heading"><div><span className="workspace-pixel-label">01 / PRIVATE DETAILS</span><h2 id="basic-profile-preview-title">Basic profile</h2><p>These are the six account details collected in MEC onboarding.</p></div><span className="profile-edit-status profile-edit-status--ready">Private</span></div>
        <dl className="profile-summary-list profile-edit-sample-list">
          <div><dt>Full name</dt><dd>IDEA MAKER · sample</dd></div><div><dt>Phone</dt><dd>+91 90000 00000 · sample</dd></div>
          <div><dt>MEC registration</dt><dd>Sample only</dd></div><div><dt>Institution</dt><dd>Model Engineering College</dd></div>
          <div><dt>Department</dt><dd>Computer Science · sample</dd></div><div><dt>Current study year</dt><dd>Year 3 · sample</dd></div>
        </dl>
        <p className="profile-edit-preview-note">Real members edit these details through the account form. This visual preview does not connect to an account.</p>
        <Link className="button" href="/design/onboarding">View onboarding layout <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </section>

      <section className="profile-edit-section profile-optional-editor" aria-label="Optional public profile preview">
        <div className="profile-edit-section-heading"><div><span className="workspace-pixel-label">02 / OPTIONAL PROFILE</span><h2>Profile settings, links & interests</h2><p>Try the public-profile layout below. It remains a local visual draft.</p></div><span className="profile-edit-status profile-edit-status--offline">Preview only</span></div>
        <PublicProfileEditor preview defaultOpen showCard={false} identity={{ name: 'IDEA MAKER', detail: 'MODEL ENGINEERING COLLEGE · SAMPLE' }} />
      </section>

      <PreviewSection id="projects" number="04" title="Projects" message="Your real project membership appears in the Projects area after sign-in. No project data is included in this preview." />
      <PreviewSection id="activities" number="05" title="Activity" message="Verified event attendance will appear from IDEALAB event records once attendance reads are connected." />
      <PreviewSection id="work-experience" number="06" title="Work experience" message="The shared profile does not yet store work experience entries." />
      <PreviewSection id="education" number="07" title="Education" message="MEC department and study year are part of Basic profile. Other education history is not yet stored." />
      <PreviewSection id="volunteering" number="08" title="Volunteering" message="The shared profile does not yet store volunteering entries." />
    </div>
  </MemberWorkspaceShell>;
}
