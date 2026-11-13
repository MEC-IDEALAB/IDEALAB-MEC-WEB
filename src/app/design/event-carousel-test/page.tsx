import { notFound } from 'next/navigation';
import { MemberWorkspaceShell } from '@/components/member-workspace-shell';
import { EventCarousel } from '@/features/events/event-carousel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Event carousel test fixture', robots: { index: false, follow: false } };

export default async function EventCarouselTestFixture({ searchParams }: { searchParams: Promise<{ count?: string }> }) {
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();
  const params = await searchParams;
  const slides = params.count === '1' ? ['One'] : ['One', 'Two', 'Three'];
  return <MemberWorkspaceShell variant="preview" activeScreen="home" activeLabel="Carousel test fixture">
    <div className="workspace-page" aria-labelledby="carousel-fixture-title">
      <span className="eyebrow">TEST FIXTURE · NOT AN EVENT PROGRAMME</span>
      <h1 id="carousel-fixture-title">Carousel interaction checks</h1>
      <EventCarousel count={slides.length}><ul className="event-programme-list event-programme-list--carousel" data-event-count={slides.length} aria-label="Carousel test slides" tabIndex={0}>
        {slides.map((slide, index) => <li key={slide}><article className="event-programme-card event-preview-card"><span className="event-preview-card__stamp" aria-hidden="true">TEST<br />{index + 1}</span><div><span className="eyebrow">LAYOUT FIXTURE</span><h2>Test slide {index + 1} of {slides.length}</h2><p>This is not an event record.</p></div></article></li>)}
      </ul></EventCarousel>
    </div>
  </MemberWorkspaceShell>;
}
