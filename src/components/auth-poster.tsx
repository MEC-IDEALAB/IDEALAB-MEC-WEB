import Image from 'next/image';
import { AuthAscii } from './auth-ascii';

/** Original decorative collage, using the lab's existing published facility photo. */
export function AuthPoster({ signup = false, mini = false }: { signup?: boolean; mini?: boolean }) {
  return <div className={`auth-poster${signup ? ' auth-poster-event' : ''}${mini ? ' auth-poster-mini' : ''}`} aria-hidden="true">
    {!mini && <div className="auth-game-window"><div className="auth-game-windowbar"><span>MEC.EXE</span><span>− □ ×</span></div><AuthAscii /><div className="auth-game-prompt"><span>↳</span> {signup ? 'PLAYER TWO? THAT’S YOU.' : 'YOUR IDEAS. NEW POSSIBILITIES.'}</div><div className="auth-game-pixel-edge" /></div>}
    <svg className="auth-poster-orbit" viewBox="0 0 280 250" fill="none">
      <ellipse cx="140" cy="125" rx="125" ry="46" transform="rotate(-32 140 125)" />
      <ellipse cx="140" cy="125" rx="125" ry="63" transform="rotate(-32 140 125)" />
      <ellipse cx="140" cy="125" rx="125" ry="82" transform="rotate(-32 140 125)" />
      <ellipse cx="140" cy="125" rx="125" ry="103" transform="rotate(-32 140 125)" />
    </svg>
    <div className="auth-poster-photo">
      <div className="auth-photo-caption"><span>{signup ? 'MEC / RASPBERRY PI WORKSHOP' : 'MACHINE / ULTIMAKER'}</span><span>↗</span></div>
      <div className="auth-photo-cutout">
        <Image src={signup ? '/events/raspberry-pi-workshop.jpg' : '/facilities/ultimaker.png'} alt="" fill sizes={mini ? '90px' : '(max-width: 800px) 260px, 380px'} />
        {signup && <svg className="auth-event-pixels" viewBox="0 0 300 180" preserveAspectRatio="none"><path d="M0 0h45v22H23v23H0ZM300 0h-23v23h-23v22h46ZM300 180h-46v-23h23v-22h23ZM0 180h23v-23h23v-23H23v23H0Z" /><path d="M75 0h22v22H75ZM278 68h22v22h-22ZM115 158h22v22h-22Z" /></svg>}
      </div>
      <span className="auth-photo-footer">{signup ? 'LEARN BY SHOWING UP.' : 'IDEA → OBJECT'}</span>
    </div>
    <svg className="auth-poster-burst" viewBox="0 0 100 100">
      <path d="M50 2 58 26 77 8 75 34 99 30 81 50 99 69 74 67 78 93 58 76 50 99 41 76 21 94 25 67 1 71 19 50 1 30 26 33 22 8 42 26Z" />
      <path d="M35 50h30M50 35v30" className="auth-burst-cross" />
    </svg>
    <div className="auth-poster-sticker">{signup ? <>GOOD<br />THINGS<br /><i>START HERE.</i></> : <>LESS WHAT IF.<br /><i>MORE TRY.</i></>}</div>
    <svg className="auth-poster-squiggle" viewBox="0 0 180 60" fill="none"><path d="M4 29c15-40 32-31 31 0s-16 29-13 6 23-39 37-16 7 39 0 26 3-51 23-39 10 53 2 42 0-47 22-34 2 42-4 29 20-44 33-25 15 29 39 5" /></svg>
    <span className="auth-poster-pixel auth-poster-pixel-one" />
    <span className="auth-poster-pixel auth-poster-pixel-two" />
    <span className="auth-poster-pixel auth-poster-pixel-three" />
  </div>;
}
