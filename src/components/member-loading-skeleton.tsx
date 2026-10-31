export type MemberLoadingKind = 'page' | 'opening' | 'visits' | 'events' | 'projects';

const statusText: Record<MemberLoadingKind, string> = {
  page: 'Loading your workspace.',
  opening: 'Loading the lab opening status.',
  visits: 'Loading your lab visits.',
  events: 'Loading the event programme.',
  projects: 'Loading your projects.',
};

function Line({ size = 'regular' }: { size?: 'eyebrow' | 'title' | 'regular' | 'short' | 'long' }) {
  return <span className={`member-loading__line member-loading__line--${size}`} />;
}

function PlaceholderCard({ lines = 2 }: { lines?: number }) {
  return <div className="member-loading__card">
    <span className="member-loading__mark" />
    <div className="member-loading__card-copy"><Line size="short" />{Array.from({ length: lines }, (_, index) => <Line key={index} size={index ? 'long' : 'regular'} />)}</div>
  </div>;
}

function ProjectPlaceholderCard() {
  return <div className="member-loading__project-card">
    <div className="member-loading__project-heading">
      <span className="member-loading__mark" />
      <span className="member-loading__line member-loading__project-stage" />
      <span className="member-loading__line member-loading__project-arrow" />
    </div>
    <Line size="title" />
    <div className="member-loading__project-copy">
      <Line size="regular" />
      <Line size="long" />
      <Line size="regular" />
      <Line size="long" />
    </div>
    <div className="member-loading__project-footer"><Line size="short" /><Line size="short" /></div>
  </div>;
}

function PageShape() {
  return <div className="member-loading__page-shape">
    <div className="member-loading__page-heading"><Line size="eyebrow" /><Line size="title" /><Line size="long" /></div>
    <PlaceholderCard lines={1} />
    <div className="member-loading__quick-actions" aria-hidden="true"><i /><i /><i /><i /></div>
    <div className="member-loading__card-grid"><PlaceholderCard /><PlaceholderCard /></div>
  </div>;
}

function PanelShape({ kind }: { kind: Exclude<MemberLoadingKind, 'page'> }) {
  if (kind === 'projects') {
    return <div className="member-loading__collection">
      <div className="member-loading__collection-heading"><Line size="title" /><Line size="short" /></div>
      <div className="member-loading__project-grid">
        {Array.from({ length: 3 }, (_, index) => <ProjectPlaceholderCard key={index} />)}
      </div>
    </div>;
  }

  if (kind === 'events') {
    return <div className="member-loading__collection">
      <div className="member-loading__collection-heading"><Line size="title" /><Line size="short" /></div>
      <PlaceholderCard lines={2} />
      <PlaceholderCard lines={2} />
    </div>;
  }

  return <div className="member-loading__panel-shape">
    <div className="member-loading__panel-heading"><span className="member-loading__mark" /><div><Line size="short" /><Line size="regular" /></div></div>
    <Line size="long" />
    <Line size="regular" />
    {kind === 'visits' && <div className="member-loading__panel-footer"><Line size="short" /><Line size="short" /></div>}
  </div>;
}

/** Truthful loading structure for member pages and streamed data panels. */
export function MemberLoadingSkeleton({ kind = 'page' }: { kind?: MemberLoadingKind }) {
  return <div className={`member-loading member-loading--${kind}`} role="status" aria-busy="true">
    <span className="member-loading__sr-only">{statusText[kind]}</span>
    <div className="member-loading__visual" aria-hidden="true">
      {kind === 'page' ? <PageShape /> : <PanelShape kind={kind} />}
    </div>
  </div>;
}
