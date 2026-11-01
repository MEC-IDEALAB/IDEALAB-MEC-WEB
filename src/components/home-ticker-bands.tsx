'use client';

import { Fragment } from 'react';
import { useAutomaticMotion } from '@/components/automatic-motion';

const highlights = [
  'AICTE × COGNICOR × MEC',
  'Established in 2022',
  'Engage · Explore · Experience · Express · Excel',
  'From idea to prototype',
  'Workshops · Training · Multidisciplinary STEM',
];

const quotes = [
  '“Stay curious. Make something real.”',
  '“Every prototype starts with a question.”',
  '“Try. Learn. Make it better.”',
];

function MovingTrack({ items = highlights }: { items?: string[] }) {
  return (
    <div className="ticker-track" aria-hidden="true">
      {[0, 1].map(copy => (
        <div className="ticker-run" key={copy}>
          {items.map(text => (
            <Fragment key={text}>
              <span className="ticker-item">{text}</span>
              <span className="ticker-separator">\\</span>
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}

export function HomeTickerBottom() {
  const { pauseForKeyboard } = useAutomaticMotion();
  return (
    <section id="quote-ticker" className="ticker-region quote-ticker-region" aria-label="Ideas to keep you making">
      <p className="sr-only" id="lab-quotes-copy">{quotes.join(' ')}</p>
      <div className="ticker-viewport quote-ticker-viewport">
        <div className="ticker-band quote-ticker-band">
          <div className="quote-ticker-content" role="group" tabIndex={0} aria-label="Moving quotes. Focusing this region pauses automatic motion until it is resumed using the footer Motion setting." aria-describedby="lab-quotes-copy" onFocusCapture={pauseForKeyboard}><MovingTrack items={quotes} /></div>
        </div>
      </div>
    </section>
  );
}

export function HomeTickerTop() {
  const { pauseForKeyboard } = useAutomaticMotion();
  return (
    <section id="maker-ticker" className="ticker-region maker-ticker-region" aria-label="IDEA Lab highlights">
      <p className="sr-only" id="lab-highlights-copy">
        IDEALAB MEC at Model Engineering College. Established in 2022 with AICTE and CogniCor,
        the lab supports workshops, training and multidisciplinary STEM.
      </p>
      <div className="ticker-viewport maker-ticker-viewport">
        <div className="ticker-band maker-ticker-band">
          <div className="maker-ticker-content" role="group" tabIndex={0} aria-label="Moving highlights. Focusing this region pauses automatic motion until it is resumed using the footer Motion setting." aria-describedby="lab-highlights-copy" onFocusCapture={pauseForKeyboard}><MovingTrack /></div>
        </div>
      </div>
    </section>
  );
}
