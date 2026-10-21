'use client';

import { useState } from 'react';
import { ClipboardList, Clock3, Eye, FileClock, Inbox, LockKeyhole, ShieldCheck } from 'lucide-react';

const layouts = [
  {
    id: 'machine',
    label: 'Machine / Room Head',
    title: 'Machine & room workspace',
    description: 'Requests and equipment context will be scoped to the machine or room assignment verified for the signed-in staff member.',
    navigation: ['Requests', 'Tasks', 'Queue', 'Machines', 'Reports'],
  },
  {
    id: 'operations',
    label: 'Operations Head',
    title: 'Operations workspace',
    description: 'Operations requests, inventory and borrowing will appear only after the server confirms the staff member’s current responsibility.',
    navigation: ['Requests', 'Inventory', 'Borrowing', 'Visitors', 'Reports'],
  },
  {
    id: 'events',
    label: 'Events Head',
    title: 'Events workspace',
    description: 'Event and participation work will be shown only where the signed-in staff member has current, verified access.',
    navigation: ['Events', 'Registrations', 'Payments', 'Attendance', 'Reports'],
  },
  {
    id: 'admin',
    label: 'Super Admin',
    title: 'Administration workspace',
    description: 'Head assignment, revocation and handover need audited server-side controls. Those controls are intentionally absent here.',
    navigation: ['Members', 'Head assignments', 'Handover', 'Audit log'],
  },
] as const;

export function StaffWorkspacePreview() {
  const [activeId, setActiveId] = useState<(typeof layouts)[number]['id']>('machine');
  const activeLayout = layouts.find(layout => layout.id === activeId) ?? layouts[0];

  return (
    <div className="staff-preview-workbench">
      <section className="staff-layout-picker" aria-labelledby="staff-layout-title">
        <div className="staff-layout-picker-heading">
          <div>
            <p className="eyebrow">LAYOUT SELECTOR</p>
            <h2 id="staff-layout-title">Choose a staff view</h2>
          </div>
          <span>Wireframe only</span>
        </div>
        <div className="staff-layout-options" role="group" aria-label="Select a staff workspace layout">
          {layouts.map(layout => (
            <button
              aria-pressed={activeLayout.id === layout.id}
              className="staff-layout-option"
              key={layout.id}
              onClick={() => setActiveId(layout.id)}
              type="button"
            >
              {layout.label}
            </button>
          ))}
        </div>
      </section>

      <section className="staff-scope-banner" aria-live="polite" aria-atomic="true">
        <div>
          <p className="eyebrow">CURRENT DESIGN SCOPE</p>
          <h2>{activeLayout.title}</h2>
          <p>{activeLayout.description}</p>
        </div>
        <span className="staff-preview-state"><Eye size={16} aria-hidden="true" /> Not connected</span>
      </section>

      <div className="staff-workspace-grid">
        <aside className="staff-nav-preview" aria-label="Planned workspace navigation">
          <div className="staff-nav-heading">
            <span className="staff-nav-symbol" aria-hidden="true">IM</span>
            <div><strong>IDEALAB MEC</strong><span>STAFF WORKSPACE</span></div>
          </div>
          <p className="eyebrow">PLANNED NAVIGATION</p>
          <ul>
            {activeLayout.navigation.map((item, index) => (
              <li className={index === 0 ? 'is-current' : undefined} key={item}>
                <span aria-hidden="true">{index === 0 ? <Inbox size={17} /> : <ClipboardList size={17} />}</span>{item}
              </li>
            ))}
          </ul>
          <div className="staff-nav-note"><LockKeyhole size={17} aria-hidden="true" /><p>Navigation and access are concepts only. No role is assigned by this selector.</p></div>
        </aside>

        <section className="staff-inbox-preview" aria-labelledby="staff-inbox-title">
          <header className="staff-inbox-heading">
            <div><p className="eyebrow">WORKSPACE / INBOX</p><h3 id="staff-inbox-title">Review queue</h3></div>
            <span className="staff-empty-label">No live data</span>
          </header>
          <div className="staff-inbox-grid">
            <article className="staff-empty-panel">
              <div className="staff-empty-icon"><Inbox size={23} aria-hidden="true" /></div>
              <p className="eyebrow">INBOX PREVIEW</p>
              <h4>Nothing is loaded here.</h4>
              <p>This preview contains no requests, people, counts or machine records. A live inbox must use server-verified access.</p>
              <span className="staff-empty-indicator"><span aria-hidden="true" /> Empty wireframe</span>
            </article>
            <article className="staff-detail-panel">
              <p className="eyebrow">ITEM DETAILS</p>
              <div className="staff-detail-icon"><FileClock size={22} aria-hidden="true" /></div>
              <h4>Select an item to review</h4>
              <p>A real staff screen will show the permitted next step and its activity history. This preview has no selectable records or operational controls.</p>
              <div className="staff-detail-rule"><Clock3 size={17} aria-hidden="true" /><span>Preferred times remain requests until confirmed.</span></div>
            </article>
          </div>
          <p className="staff-permission-note"><ShieldCheck size={18} aria-hidden="true" /> Actions must be authorized against the current server-side assignment.</p>
        </section>
      </div>

      <section className="staff-flow-notes" aria-labelledby="staff-rules-title">
        <div className="staff-flow-heading"><p className="eyebrow">BEHAVIORAL GUARANTEES TO IMPLEMENT</p><h3 id="staff-rules-title">Clear decisions. Accountable history.</h3></div>
        <div className="staff-flow-note staff-flow-note-yellow"><span>01</span><p><strong>Scope comes first.</strong> Machine and room responsibilities are checked for every protected action.</p></div>
        <div className="staff-flow-note staff-flow-note-pink"><span>02</span><p><strong>Changed times need agreement.</strong> A requester must accept a head’s new proposed time.</p></div>
        <div className="staff-flow-note staff-flow-note-purple"><span>03</span><p><strong>Keep the request open.</strong> If a time change is declined, another proposal can follow; there is no automatic expiry.</p></div>
      </section>
    </div>
  );
}
