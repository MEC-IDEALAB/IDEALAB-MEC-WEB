"use client";

import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  CircleHelp,
  CircleSlash2,
  ClipboardList,
  Clock3,
  DoorOpen,
  FlaskConical,
  FolderKanban,
  Home,
  LockKeyhole,
  Package,
  Settings2,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react';
import { HomeMotion } from '@/components/home-motion';
import { MemberWorkspaceShell } from '@/components/member-workspace-shell';

export type StudentPreviewScreen =
  | 'home'
  | 'lab'
  | 'profile'
  | 'projects'
  | 'events'
  | 'requests'
  | 'notifications'
  | 'visits'
  | 'borrowing'
  | 'settings';

const screens: Array<{
  id: StudentPreviewScreen;
  label: string;
  icon: typeof Home;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'lab', label: 'Lab', icon: FlaskConical },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'requests', label: 'Requests', icon: ClipboardList },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'visits', label: 'Visits', icon: DoorOpen },
  { id: 'borrowing', label: 'Borrowing', icon: Package },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

const screenCopy: Record<StudentPreviewScreen, { title: string; eyebrow: string; intro: string }> = {
  home: {
    title: 'A home base for your next idea.',
    eyebrow: 'STUDENT WORKSPACE',
    intro: 'A clear starting point for lab visits, projects, events and work requests.',
  },
  lab: {
    title: 'Find your way around the lab.',
    eyebrow: 'LAB',
    intro: 'Access information and visit guidance belong together, before and after a lab session.',
  },
  profile: {
    title: 'Your details, in your control.',
    eyebrow: 'PROFILE',
    intro: 'The planned student profile keeps required account details private by default.',
  },
  projects: {
    title: 'Projects take shape together.',
    eyebrow: 'PROJECTS',
    intro: 'A signed-in space to discover work and ask to join a team.',
  },
  events: {
    title: 'Make room for what is next.',
    eyebrow: 'EVENTS',
    intro: 'Workshops and lab events will have a dedicated place for details and participation.',
  },
  requests: {
    title: 'Turn an idea into a work request.',
    eyebrow: 'REQUESTS',
    intro: 'Machine and Operations support follow separate questions and review paths.',
  },
  notifications: {
    title: 'Keep the next step in view.',
    eyebrow: 'NOTIFICATIONS',
    intro: 'Important changes should be easy to understand and return to later.',
  },
  visits: {
    title: 'Plan a lab visit with clarity.',
    eyebrow: 'VISITS',
    intro: 'Visit guidance and check-in history will live in one predictable place.',
  },
  borrowing: {
    title: 'Keep shared tools moving.',
    eyebrow: 'BORROWING',
    intro: 'Browse approved equipment, understand its status and follow a clear return path.',
  },
  settings: {
    title: 'Make this space work for you.',
    eyebrow: 'SETTINGS',
    intro: 'Review appearance and account preferences in one predictable place.',
  },
};

function screenHref(screen: StudentPreviewScreen) {
  return `/design/student?screen=${screen}`;
}

function ModuleUnavailable({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="student-preview-unavailable" role="note">
      <span className="student-preview-unavailable-icon"><CircleSlash2 size={20} aria-hidden="true" /></span>
      <div>
        <p className="student-preview-status-label">UNAVAILABLE IN THIS PREVIEW</p>
        <h3>{title}</h3>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function ModuleLink({
  screen,
  title,
  detail,
  icon: Icon,
  tone,
  stagger = 0,
}: {
  screen: StudentPreviewScreen;
  title: string;
  detail: string;
  icon: typeof Home;
  tone: 'yellow' | 'pink' | 'blue' | 'purple' | 'green' | 'red';
  stagger?: number;
}) {
  return (
    <Link className={`student-preview-module student-preview-tone-${tone}`} href={screenHref(screen)} data-reveal="card" data-stagger={stagger}>
      <span className="student-preview-module-icon"><Icon size={20} aria-hidden="true" /></span>
      <span className="student-preview-module-copy"><strong>{title}</strong><span>{detail}</span></span>
      <ArrowRight className="student-preview-module-arrow" size={19} aria-hidden="true" />
    </Link>
  );
}

function HomeScreen() {
  return (
    <>
      <section className="student-preview-welcome student-preview-panel" data-reveal="section">
        <div className="student-preview-welcome-copy">
          <p className="student-preview-kicker"><span aria-hidden="true">01 / 09</span> YOUR MAKER SPACE</p>
          <h2>Good ideas need a place to begin.</h2>
          <p>Explore the planned student workspace. Each section below is a layout preview, with no live member data connected.</p>
          <Link className="student-preview-outline-link" href="/design/student?screen=requests">View the request flow <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className="student-preview-doodle" aria-hidden="true">
          <span className="student-preview-doodle-label">IDEA → PROTOTYPE</span>
          <div className="student-preview-doodle-orbit"><FlaskConical size={45} strokeWidth={1.6} /></div>
          <ArrowDownRight className="student-preview-doodle-arrow" size={37} strokeWidth={1.6} />
          <span className="student-preview-doodle-star">✳</span>
        </div>
      </section>

      <section className="student-preview-section" aria-labelledby="student-preview-shortcuts" data-reveal="section">
        <div className="student-preview-section-heading">
          <div><p className="student-preview-kicker">PICK UP WHERE YOU ARE</p><h2 id="student-preview-shortcuts">Your workspace</h2></div>
          <span className="student-preview-section-aside">DESIGN MAP · NOT CONNECTED</span>
        </div>
        <div className="student-preview-module-grid">
          <ModuleLink screen="requests" title="Work requests" detail="Ask for Machine or Operations support" icon={Wrench} tone="yellow" stagger={0} />
          <ModuleLink screen="projects" title="Projects" detail="Discover work and join a team" icon={FolderKanban} tone="purple" stagger={1} />
          <ModuleLink screen="events" title="Events & workshops" detail="Explore learning opportunities" icon={CalendarDays} tone="pink" stagger={2} />
          <ModuleLink screen="notifications" title="Notifications" detail="Return to an update or next step" icon={Bell} tone="blue" stagger={0} />
          <ModuleLink screen="visits" title="Lab visits" detail="See visit guidance and history" icon={DoorOpen} tone="green" stagger={1} />
          <ModuleLink screen="borrowing" title="Borrowing" detail="Browse tools and track a return" icon={Package} tone="blue" stagger={2} />
          <ModuleLink screen="profile" title="Your profile" detail="Review the planned private profile" icon={UserRound} tone="red" stagger={2} />
        </div>
      </section>

      <section className="student-preview-note-grid" aria-label="Pilot notes">
        <article className="student-preview-note student-preview-note-self-declared" data-reveal="card" data-stagger="0">
          <span className="student-preview-note-icon"><ShieldCheck size={20} aria-hidden="true" /></span>
          <div><p className="student-preview-kicker">MEC STUDENT PILOT</p><h3>Self-declared registration</h3><p>The pilot plan asks for an MEC registration number and a student self-declaration. This preview checks neither ownership nor uniqueness.</p></div>
        </article>
        <article className="student-preview-note student-preview-note-request" data-reveal="card" data-stagger="1">
          <span className="student-preview-note-icon"><Clock3 size={20} aria-hidden="true" /></span>
          <div><p className="student-preview-kicker">REQUESTS</p><h3>Time stays clear</h3><p>A preferred time is a request. If a head proposes another time, the requester must accept before it is agreed.</p></div>
        </article>
      </section>
    </>
  );
}

function LabScreen() {
  return (
    <>
      <section className="student-preview-feature student-preview-feature-lab student-preview-panel" data-reveal="section">
        <div><p className="student-preview-kicker">A PLACE TO EXPLORE</p><h2>Make, learn, try again.</h2><p>Keep lab information close to visit guidance, so members know what to expect before they arrive.</p></div>
        <span className="student-preview-feature-art" aria-hidden="true"><FlaskConical size={46} strokeWidth={1.5} /><span>IDEA<br />LAB</span></span>
      </section>
      <div className="student-preview-two-column" data-reveal="section">
        <article className="student-preview-panel student-preview-content-card"><p className="student-preview-kicker">LAB INFORMATION</p><h3>Know before you visit.</h3><p>Approved access hours, safety guidance and support contacts belong here once the lab confirms them.</p><Link className="student-preview-text-link" href={screenHref('visits')}>Visit planning <ArrowRight size={17} aria-hidden="true" /></Link></article>
        <ModuleUnavailable title="Machine and service catalog" detail="The approved machines, service categories and booking rules are not connected to this design preview." />
      </div>
      <ModuleUnavailable title="Live lab access" detail="Hours, check-in and check-out are unavailable here. No visit has been started or recorded." />
    </>
  );
}

function ProfileScreen() {
  const fields = ['Name', 'Phone with country code', 'MEC registration number', 'Department', 'Current study year', 'Institution'];
  return (
    <>
      <section className="student-preview-profile-card student-preview-panel" data-reveal="section">
        <div className="student-preview-profile-icon"><UserRound size={26} aria-hidden="true" /></div>
        <div><p className="student-preview-kicker">PRIVATE BY DEFAULT</p><h2>Profile details stay yours.</h2><p>The planned account uses the minimum details needed for the MEC student pilot. This wireframe contains no personal information.</p></div>
        <span className="student-preview-profile-badge"><LockKeyhole size={15} aria-hidden="true" /> No profile loaded</span>
      </section>
      <section className="student-preview-panel student-preview-field-plan" aria-labelledby="student-preview-profile-fields" data-reveal="section">
        <div className="student-preview-section-heading"><div><p className="student-preview-kicker">PLANNED ONBOARDING</p><h3 id="student-preview-profile-fields">Six required details</h3></div><span className="student-preview-section-aside">LAYOUT ONLY</span></div>
        <ul>{fields.map((field, index) => <li key={field}><span className="student-preview-field-number">0{index + 1}</span><span>{field}</span><span className="student-preview-field-state">Not collected</span></li>)}</ul>
        <p className="student-preview-privacy-copy"><ShieldCheck size={17} aria-hidden="true" /> MEC registration is self-declared for this pilot. No ownership or duplicate check is represented here.</p>
      </section>
      <section className="student-preview-panel student-preview-profile-edit" aria-labelledby="student-preview-profile-edit-heading" data-reveal="section">
        <div className="student-preview-section-heading"><div><p className="student-preview-kicker">EDIT YOUR DETAILS</p><h3 id="student-preview-profile-edit-heading">Profile editing layout</h3></div><span className="student-preview-section-aside">FIELDS NOT LOADED</span></div>
        <p className="student-preview-profile-edit-intro">Your required details are private by default. Editing will update only your own profile after the shared account rules are approved.</p>
        <div className="student-preview-edit-grid" aria-label="Planned profile edit fields">
          {['Full name', 'Phone number · +country code', 'MEC registration number', 'Department', 'Current study year · Year 1–8', 'Institution · Model Engineering College'].map((field, index) => <div className="student-preview-edit-field" key={field}><span className="student-preview-field-label">{field}</span><span className="student-preview-input-wireframe">{index === 5 ? 'Fixed for the MEC pilot' : 'No profile loaded'}</span></div>)}
        </div>
        <p className="student-preview-privacy-copy"><LockKeyhole size={17} aria-hidden="true" /> Registration-number changes must preserve the unique-claim rule. This preview does not validate or save profile edits.</p>
      </section>
      <Link className="student-preview-settings-shortcut" href={screenHref('settings')}><Settings2 size={18} aria-hidden="true" /><span>Workspace settings</span><ArrowRight size={17} aria-hidden="true" /></Link>
    </>
  );
}

function ProjectsScreen() {
  return <><section className="student-preview-feature student-preview-feature-projects student-preview-panel" data-reveal="section"><div><p className="student-preview-kicker">BUILD TOGETHER</p><h2>Find a project worth exploring.</h2><p>Project discovery should show only the information a signed-in member is allowed to see.</p></div><span className="student-preview-feature-art" aria-hidden="true"><FolderKanban size={47} strokeWidth={1.5} /><span>MAKE<br />TOGETHER</span></span></section>
    <section className="student-preview-section" aria-labelledby="student-preview-project-discovery" data-reveal="section"><div className="student-preview-section-heading"><div><p className="student-preview-kicker">DISCOVER</p><h2 id="student-preview-project-discovery">Project discovery</h2></div><span className="student-preview-section-aside">SIGNED-IN RECORDS</span></div><ModuleUnavailable title="Project records" detail="Project names, teams and membership requests are not loaded in this preview." /></section>
    <section className="student-preview-panel student-preview-flow-panel" aria-labelledby="student-preview-project-detail" data-reveal="section"><div className="student-preview-section-heading"><div><p className="student-preview-kicker">PROJECT DETAIL · LAYOUT ONLY</p><h3 id="student-preview-project-detail">One project, with its next step</h3></div><span className="student-preview-section-aside">NO PROJECT SELECTED</span></div><div className="student-preview-detail-grid"><div className="student-preview-detail-sheet"><span className="student-preview-status-label">OVERVIEW</span><h4>Project name · not loaded</h4><p>Description, creator, visibility and any approved team details appear in this private view.</p><div className="student-preview-wireframe-lines" aria-hidden="true"><i /><i /><i /></div></div><div className="student-preview-flow-card"><span className="student-preview-status-label">MEMBERSHIP REQUEST</span><h4>Ask to join</h4><p>A member requests access; the project creator reviews and approves or declines it.</p><ol className="student-preview-flow-list"><li>Open an allowed project</li><li>Send a join request</li><li>Wait for the creator’s decision</li></ol><span className="student-preview-static-action">Join request · unavailable in preview</span></div></div></section>
  </>;
}

function EventsScreen() {
  return <><section className="student-preview-feature student-preview-feature-events student-preview-panel" data-reveal="section"><div><p className="student-preview-kicker">LEARN · MEET · MAKE</p><h2>Make your next workshop count.</h2><p>One place for event details, eligibility and a clear participation path.</p></div><span className="student-preview-feature-art" aria-hidden="true"><CalendarDays size={45} strokeWidth={1.5} /><span>YOUR<br />NEXT THING</span></span></section><ModuleUnavailable title="Event records" detail="No event records or registration status are available in this preview." />
    <section className="student-preview-panel student-preview-flow-panel" aria-labelledby="student-preview-event-detail" data-reveal="section"><div className="student-preview-section-heading"><div><p className="student-preview-kicker">EVENT DETAIL · LAYOUT ONLY</p><h3 id="student-preview-event-detail">Know the terms before registering</h3></div><span className="student-preview-section-aside">NO EVENT SELECTED</span></div><div className="student-preview-detail-grid"><div className="student-preview-detail-sheet"><span className="student-preview-status-label">EVENT INFORMATION</span><h4>Title and schedule · not loaded</h4><p>Date, venue, eligibility, capacity and organizer details appear only when approved by the Events Head.</p><div className="student-preview-wireframe-lines" aria-hidden="true"><i /><i /><i /></div></div><div className="student-preview-flow-card"><span className="student-preview-status-label">REGISTRATION STATES</span><h4>One clear participation path</h4><ol className="student-preview-flow-list"><li>Review eligibility and event terms</li><li>Free event: confirm eligible registration</li><li>Paid event: payment proof awaits manual verification</li><li>Seat is confirmed only after the approved capacity/payment checks</li></ol><p>Event-specific prices, capacity, cancellation and refund terms must be shown before a real registration.</p><span className="student-preview-static-action">Registration · unavailable in preview</span></div></div></section>
  </>;
}

function RequestsScreen() {
  return <><section className="student-preview-feature student-preview-feature-requests student-preview-panel" data-reveal="section"><div><p className="student-preview-kicker">ONE STARTING POINT</p><h2>Tell us what you want to make.</h2><p>Choose Machine or Operations support, add the details, then review before any real submission.</p><Link className="student-preview-outline-link" href="/design/requests">Open the request draft preview <ArrowRight size={17} aria-hidden="true" /></Link></div><span className="student-preview-feature-art" aria-hidden="true"><ClipboardList size={45} strokeWidth={1.5} /><span>PLAN<br />THE WORK</span></span></section><ModuleUnavailable title="Submitted requests" detail="This preview has no request history, assignments or live status. The linked composer stores only a local, unsubmitted draft." />
    <section className="student-preview-panel student-preview-flow-panel" aria-labelledby="student-preview-request-lifecycle" data-reveal="section"><div className="student-preview-section-heading"><div><p className="student-preview-kicker">REQUEST DETAIL · STATE MAP</p><h3 id="student-preview-request-lifecycle">From preferred time to an agreed time</h3></div><span className="student-preview-section-aside">NO REQUEST SELECTED</span></div><ol className="student-preview-lifecycle"><li><span>01</span><div><strong>Member requests support</strong><p>Choose Machine or Operations and request a preferred time.</p></div></li><li><span>02</span><div><strong>Assigned head reviews</strong><p>The head may confirm the preferred time or propose a change.</p></div></li><li><span>03</span><div><strong>Requester decides</strong><p>A changed time stays proposed until accepted. Declining keeps the request open for another proposal.</p></div></li><li><span>04</span><div><strong>Agreed time is recorded</strong><p>Acceptance is recorded in history. A requested time is not a guaranteed slot or capacity reservation.</p></div></li></ol></section>
    <ModuleUnavailable title="Online request submission" detail="This design preview cannot create, submit, reserve or track a real request. The linked draft screen is isolated from operations." /><article className="student-preview-rule-note" data-reveal="card"><Clock3 size={19} aria-hidden="true" /><p><strong>If timing changes:</strong> the requester accepts a new proposed time. Declining keeps the request open for another proposal.</p></article></>;
}

function NotificationsScreen() {
  return <><section className="student-preview-panel student-preview-notification-intro" data-reveal="section"><span className="student-preview-notification-art" aria-hidden="true"><Bell size={34} strokeWidth={1.5} /></span><div><p className="student-preview-kicker">A LITTLE LESS GUESSING</p><h2>Updates with a useful next step.</h2><p>Notifications should say what changed, who needs to act and where to continue.</p></div></section><ModuleUnavailable title="Your notification feed" detail="No message, request update or event reminder is connected to this preview." /><article className="student-preview-panel student-preview-content-card" data-reveal="card"><p className="student-preview-kicker">DESIGN PRINCIPLE</p><h3>Keep actions understandable.</h3><p>Messages should be private to the signed-in account and link to the exact place where the next step can happen.</p></article></>;
}

function SettingsScreen() {
  return <>
    <section className="student-preview-panel student-preview-settings-card" aria-labelledby="student-preview-settings-appearance" data-reveal="section">
      <div className="student-preview-section-heading"><div><p className="student-preview-kicker">APPEARANCE</p><h2 id="student-preview-settings-appearance">Choose a comfortable view</h2></div><span className="student-preview-section-aside">SAVED ON THIS DEVICE</span></div>
      <div className="student-preview-settings-row"><div><strong>Colour theme</strong><p>The light and dark control in the top bar switches immediately and remembers your choice on this device.</p></div><span className="student-preview-settings-state"><span aria-hidden="true" /> Available</span></div>
    </section>
    <section className="student-preview-panel student-preview-settings-card" aria-labelledby="student-preview-settings-account" data-reveal="section">
      <div className="student-preview-section-heading"><div><p className="student-preview-kicker">ACCOUNT</p><h2 id="student-preview-settings-account">Your details stay private</h2></div><span className="student-preview-section-aside">NO ACCOUNT LOADED</span></div>
      <div className="student-preview-settings-row"><div><strong>Student profile</strong><p>Review the planned MEC pilot fields and profile privacy notes.</p></div><Link className="student-preview-text-link" href={screenHref('profile')}>Open profile <ArrowRight size={17} aria-hidden="true" /></Link></div>
      <p className="student-preview-privacy-copy"><LockKeyhole size={17} aria-hidden="true" /> This design preview has no signed-in account and does not save profile or notification preferences.</p>
    </section>
  </>;
}

function VisitsScreen() {
  return <><section className="student-preview-feature student-preview-feature-visits student-preview-panel" data-reveal="section"><div><p className="student-preview-kicker">ARRIVE READY</p><h2>Your lab visit, in one place.</h2><p>Access guidance first, with a clear visit history after a real check-in flow is approved.</p></div><span className="student-preview-feature-art" aria-hidden="true"><DoorOpen size={45} strokeWidth={1.5} /><span>COME<br />ON IN</span></span></section><ModuleUnavailable title="Live visit guidance" detail="Approved access hours, purpose guidance and contact details are not connected to this preview." />
    <section className="student-preview-panel student-preview-flow-panel" aria-labelledby="student-preview-visit-flow" data-reveal="section"><div className="student-preview-section-heading"><div><p className="student-preview-kicker">VISIT · CHECK-IN / CHECK-OUT</p><h3 id="student-preview-visit-flow">A visit has a clear start and finish</h3></div><span className="student-preview-section-aside">NO VISIT ACTIVE</span></div><div className="student-preview-visit-states"><article><span className="student-preview-state-dot" /><p className="student-preview-status-label">BEFORE ARRIVAL</p><h4>Read the approved guidance</h4><p>Purpose and access rules appear before a member starts a visit.</p></article><article><span className="student-preview-state-dot" /><p className="student-preview-status-label">CHECKED IN</p><h4>Active visit</h4><p>A real check-in records purpose and start time. It grants no machine authority.</p><span className="student-preview-static-action">Check out · unavailable in preview</span></article><article><span className="student-preview-state-dot" /><p className="student-preview-status-label">HISTORY</p><h4>Visit record</h4><p>Completed visits show recorded start and end times. No sample history is shown.</p></article></div></section>
  </>;
}

function BorrowingScreen() {
  return <><section className="student-preview-feature student-preview-feature-borrowing student-preview-panel" data-reveal="section"><div><p className="student-preview-kicker">SHARED LAB TOOLS</p><h2>Find the right equipment for your work.</h2><p>Browse approved item details, then follow the same issue and return record from request to verification.</p></div><span className="student-preview-feature-art" aria-hidden="true"><Package size={45} strokeWidth={1.5} /><span>USE IT<br />RETURN IT</span></span></section>
    <section className="student-preview-section" aria-labelledby="student-preview-catalog-heading" data-reveal="section"><div className="student-preview-section-heading"><div><p className="student-preview-kicker">EQUIPMENT · CONSUMABLES</p><h3 id="student-preview-catalog-heading">Browse the approved catalog</h3></div><span className="student-preview-section-aside">NO STOCK DATA LOADED</span></div><div className="student-preview-catalog-layout"><div className="student-preview-catalog-filters" aria-label="Catalog categories"><span>All items · layout</span><span>Equipment · layout</span><span>Consumables · layout</span></div><div className="student-preview-catalog-placeholder"><div className="student-preview-catalog-icon"><Package size={23} aria-hidden="true" /></div><div><p className="student-preview-status-label">CATALOG UNAVAILABLE</p><h4>Approved item records will appear here.</h4><p>Each item needs an Operations-approved category, quantity/status, borrowing rules and return instructions before requests open.</p></div></div></div></section>
    <section className="student-preview-panel student-preview-flow-panel" aria-labelledby="student-preview-borrow-flow" data-reveal="section"><div className="student-preview-section-heading"><div><p className="student-preview-kicker">BORROW · RETURN · VERIFY</p><h3 id="student-preview-borrow-flow">Track each handoff</h3></div><span className="student-preview-section-aside">NO BORROWING RECORDS</span></div><ol className="student-preview-lifecycle"><li><span>01</span><div><strong>Request an approved item</strong><p>A request does not reserve stock or guarantee issue.</p></div></li><li><span>02</span><div><strong>Operations records issue</strong><p>The verified item, quantity and expected return date belong in the handoff record.</p></div></li><li><span>03</span><div><strong>Member marks it returned</strong><p>The member can report a return for Operations to check.</p></div></li><li><span>04</span><div><strong>Operations verifies return</strong><p>Only the responsible Operations workflow completes the record.</p></div></li></ol><ModuleUnavailable title="Live inventory and borrowing" detail="This preview shows no stock, prices, requests or returns. No borrowing action is available." /></section>
  </>;
}

function ScreenContent({ screen }: { screen: StudentPreviewScreen }) {
  switch (screen) {
    case 'home': return <HomeScreen />;
    case 'lab': return <LabScreen />;
    case 'profile': return <ProfileScreen />;
    case 'projects': return <ProjectsScreen />;
    case 'events': return <EventsScreen />;
    case 'requests': return <RequestsScreen />;
    case 'notifications': return <NotificationsScreen />;
    case 'visits': return <VisitsScreen />;
    case 'borrowing': return <BorrowingScreen />;
    case 'settings': return <SettingsScreen />;
  }
}

export function StudentWorkspacePreview({ activeScreen }: { activeScreen: StudentPreviewScreen }) {
  const active = screens.find(screen => screen.id === activeScreen) ?? screens[0];
  const copy = screenCopy[active.id];
  const ActiveIcon = active.icon;

  return (
    <MemberWorkspaceShell variant="preview" activeScreen={active.id} activeLabel={active.label} signOutControl={null}>
      <HomeMotion />
      <div className="student-preview-content" id="student-preview-content" tabIndex={-1}>
          <div className="student-preview-banner" role="status">
            <CircleHelp size={18} aria-hidden="true" />
            <div><strong>DESIGN PREVIEW · NO LIVE DATA</strong><span>This empty student workspace is a layout map. It does not connect to an account or service.</span></div>
          </div>
          <header className="student-preview-page-heading">
            <div className="student-preview-page-icon"><ActiveIcon size={20} aria-hidden="true" /></div>
            <div><p className="student-preview-kicker">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.intro}</p></div>
          </header>
          <div className="student-preview-screen-content"><ScreenContent screen={active.id} /></div>
          <footer className="student-preview-footer"><span>IDEALAB MEC · STUDENT EXPERIENCE</span><Link href="/" className="student-preview-footer-link"><ArrowLeft size={16} aria-hidden="true" /> Public homepage</Link></footer>
      </div>
    </MemberWorkspaceShell>
  );
}
