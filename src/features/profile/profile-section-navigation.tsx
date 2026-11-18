'use client';

import { useEffect, useRef, useState } from 'react';
import { Boxes, BriefcaseBusiness, CalendarDays, GraduationCap, HeartHandshake } from 'lucide-react';

const chapters = [
  { id: 'profile-activity', label: 'Activity', icon: CalendarDays },
  { id: 'profile-projects', label: 'Projects', icon: Boxes },
  { id: 'profile-experience', label: 'Experience', icon: BriefcaseBusiness },
  { id: 'profile-education', label: 'Education', icon: GraduationCap },
  { id: 'profile-volunteering', label: 'Volunteering', icon: HeartHandshake },
] as const;

export function ProfileSectionNavigation() {
  const navigation = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string>(chapters[0].id);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const threshold = (navigation.current?.getBoundingClientRect().bottom ?? 0) + 24;
      const column = navigation.current?.closest<HTMLElement>('.member-main-column');
      const columnScrolls = column && /auto|scroll/.test(getComputedStyle(column).overflowY);
      const scrollArea = columnScrolls ? column : document.scrollingElement;
      const scrollPadding = scrollArea ? Number.parseFloat(getComputedStyle(scrollArea).scrollPaddingTop) || 0 : 0;
      const scrollTopEdge = columnScrolls ? column.getBoundingClientRect().top : 0;
      let current: string = chapters[0].id;
      for (const chapter of chapters) {
        const section = document.getElementById(chapter.id);
        if (section && section.getBoundingClientRect().top <= Math.max(threshold,
          scrollTopEdge + scrollPadding + (Number.parseFloat(getComputedStyle(section).scrollMarginTop) || 0) + 2)) current = chapter.id;
      }
      if (scrollArea && scrollArea.scrollHeight > scrollArea.clientHeight
        && scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 2) current = chapters.at(-1)!.id;
      setActive(current);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    document.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  useEffect(() => {
    const nav = navigation.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !link) return;
    const bounds = nav.getBoundingClientRect();
    const target = link.getBoundingClientRect();
    if (target.left < bounds.left || target.right > bounds.right) {
      nav.scrollTo({ left: nav.scrollLeft + target.left - bounds.left - (bounds.width - target.width) / 2, behavior: 'instant' });
    }
  }, [active]);

  return <nav ref={navigation} className="maker-profile-section-nav" aria-label="Profile sections">
    {chapters.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined}><Icon size={17} aria-hidden="true" /><span>{label}</span></a>)}
  </nav>;
}
