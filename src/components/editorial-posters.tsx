import { PastEventCarousel } from '@/components/past-event-carousel';

export function EditorialPosters() {
  return (
    <div className="editorial-posters">
      <article className="try-poster" data-reveal="section">
        <div className="try-poster-fields" aria-hidden="true">
          <span className="try-field try-field-pink" />
          <span className="try-field try-field-lime" />
        </div>
        <p className="poster-kicker">IDEA LAB / FIELD NOTES 01</p>
        <span className="poster-side-label poster-side-label-left" aria-hidden="true">MAKE / LEARN / REPEAT</span>
        <span className="poster-side-label poster-side-label-right" aria-hidden="true">MEC · KOCHI</span>
        <span className="poster-annotation poster-annotation-one" aria-hidden="true">TRY AGAIN ↗</span>
        <span className="poster-annotation poster-annotation-two" aria-hidden="true">IDEA → OBJECT</span>
        <h2 id="possibilities-title" className="poster-headline">
          <span className="poster-line poster-line-lime"><span className="poster-cutout">Less</span></span>
          <span className="poster-line poster-line-pink"><span className="poster-cutout">“what if”.</span></span>
          <span className="poster-line poster-line-lime"><span className="poster-cutout">More</span></span>
          <span className="poster-line poster-line-pink"><span className="poster-cutout">“let’s <em>try</em>”.</span></span>
        </h2>
        <p className="poster-footnote">You don’t need to have it all figured out.<br />Just find a good place to begin.</p>
        <span className="poster-registration" aria-hidden="true">✳ 10°01′ N · 76°20′ E</span>
      </article>

      <div className="ideas-event-card" data-reveal="card">
        <PastEventCarousel variant="editorial" />
      </div>
    </div>
  );
}
