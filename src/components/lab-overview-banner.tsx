'use client';

import Image from 'next/image';
import { Wifi, Zap } from 'lucide-react';
import { HomeTickerTop } from './home-ticker-bands';
import { AutomaticMotionControl } from './automatic-motion';

export function LabOverviewBanner() {
  return <div className="lab-overview-intro">
    <div className="playful-site discovery-landing-band"><HomeTickerTop /></div>
    <header className="lab-photo-banner">
      <h1 className="sr-only">Your lab.</h1>
      <Image src="/events/robotics-training.jpg" alt="" fill sizes="(max-width: 1288px) 100vw, 1288px" priority className="lab-photo-banner-image" />
      <div className="lab-photo-banner-texture" aria-hidden="true" />
      <div className="lab-photo-statuses" role="group" aria-label="Lab utilities; live status is not connected">
        <span className="lab-photo-status" role="img" aria-label="Wi-Fi status unknown">
          <Wifi size={28} aria-hidden="true" />
        </span>
        <span className="lab-photo-status" role="img" aria-label="Electricity status unknown">
          <Zap size={28} aria-hidden="true" />
        </span>
      </div>
    </header>
  </div>;
}

export function LabMotionSetting() {
  return <footer className="lab-motion-setting"><AutomaticMotionControl controls="maker-ticker quote-ticker" /><span id="automatic-motion-description" className="sr-only">Pause or resume the moving Lab highlights and quote bands. Motion follows your device preference.</span></footer>;
}
