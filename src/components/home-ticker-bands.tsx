"use client";

import { Pause, Play, Sparkles } from "lucide-react";
import { Fragment } from "react";

const labHighlights = [
  "AICTE × COGNICOR × MEC",
  "Established in 2022",
  "Engage · Explore · Experience · Express · Excel",
  "From idea to prototype",
  "Workshops · Training · Multidisciplinary STEM",
];

const workshopHighlights = [
  { text: "Digital fabrication", color: "yellow" },
  { text: "Electronics & code", color: "blue" },
  { text: "Learn by making", color: "green" },
  { text: "Epilog · Snapmaker · Ultimaker", color: "purple" },
  { text: "Ideas into prototypes", color: "coral" },
] as const;

function MovingTrack({ lower = false }: { lower?: boolean }) {
  return (
    <div className={`ticker-track${lower ? " ticker-track-lower" : ""}`} aria-hidden="true">
      {[0, 1].map((copy) => (
        <div className="ticker-run" key={copy}>
          {lower ? (
            <>
              <span className="ticker-kicker"><Sparkles size={15} aria-hidden="true" /> LAB NOTES</span>
              {workshopHighlights.map((item) => (
                <span className={`ticker-item ticker-accent-${item.color}`} key={item.text}>{item.text}</span>
              ))}
            </>
          ) : (
            labHighlights.map((text) => (
              <Fragment key={text}>
                <span className="ticker-item">{text}</span>
                <span className="ticker-separator">\\</span>
              </Fragment>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

export function HomeTickerTop() {
  return (
    <section className="ticker-region maker-ticker-region" aria-label="IDEA Lab highlights">
      <p className="sr-only">
        IDEALAB MEC at Model Engineering College. The lab was established in 2022
        with AICTE and CogniCor. Its approach is Engage, Explore, Experience,
        Express and Excel, supporting workshops, training and multidisciplinary STEM.
      </p>
      <div className="ticker-viewport maker-ticker-viewport">
        <div className="ticker-band maker-ticker-band">
          <div className="maker-ticker-content"><MovingTrack /></div>
        </div>
      </div>
    </section>
  );
}

export function HomeTickerBottom() {
  return (
    <section className="ticker-region workshop-ticker-region" aria-label="IDEA Lab activities and facilities">
      <p className="sr-only">
        Lab notes: digital fabrication, electronics and code, learning by making,
        and published facility references including Epilog, Snapmaker and Ultimaker.
      </p>
      <div className="ticker-viewport workshop-ticker-viewport">
        <div className="workshop-ticker-window">
          <div className="ticker-band workshop-ticker-band"><MovingTrack lower /></div>
        </div>
        <div className="ticker-motion-toggle">
          <input className="ticker-motion-checkbox" id="ticker-motion-toggle" type="checkbox" />
          <label className="ticker-motion-control" htmlFor="ticker-motion-toggle">
            <Pause className="ticker-motion-pause" size={15} aria-hidden="true" />
            <Play className="ticker-motion-resume" size={15} aria-hidden="true" />
            <span className="ticker-motion-label-pause">Pause</span>
            <span className="ticker-motion-label-resume">Resume</span>
            <span className="sr-only"> moving highlights</span>
          </label>
        </div>
      </div>
    </section>
  );
}
