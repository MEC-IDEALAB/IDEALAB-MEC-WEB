/** Curated institutional content, not the operational catalog or live inventory. */
export const labSource = 'https://idealab.mec.ac.in/';

export const facilities = [
  { id: 'epilog', name: 'Epilog laser engraver', category: 'Digital fabrication', description: 'CO₂ laser equipment for engraving, cutting, marking and etching.', image: '/facilities/epilog.png' },
  { id: 'snapmaker', name: 'Snapmaker A350T', category: 'Rapid prototyping', description: 'A modular platform combining 3D printing, laser cutting and CNC engraving.', image: '/facilities/snapmaker.png' },
  { id: 'ultimaker', name: 'Ultimaker 2+', category: 'Rapid prototyping', description: 'Fused deposition modelling for turning digital designs into physical prototypes.', image: '/facilities/ultimaker.png' },
  { id: 'hmt-lathe', name: 'HMT CNC lathe', category: 'Machining', description: 'Computer-controlled turning and related machining operations for rotational parts.' },
  { id: 'hmt-router', name: 'HMT CNC router', category: 'Digital fabrication', description: 'CNC routing for shaping materials and exploring fabrication techniques.' },
  { id: 'workstation', name: 'PC workstation', category: 'Design & computing', description: 'A computing workstation for design, modelling and technical project work.' },
  { id: 'pcb', name: 'PCB manufacturing station', category: 'Electronics', description: 'Equipment for printed circuit board fabrication and electronics prototyping.' },
  { id: 'sandblasting', name: 'Sandblasting machine', category: 'Surface finishing', description: 'Abrasive surface preparation and finishing equipment.' },
  { id: 'shopbot', name: 'ShopBot CNC', category: 'Digital fabrication', description: 'Computer-controlled routing to develop and fabricate parts from digital designs.' },
  { id: 'solidworks', name: 'SolidWorks software', category: 'Design & computing', description: 'Computer-aided design tools for solid modelling and engineering design.' },
  { id: 'sublimation', name: 'Sublimation printing station', category: 'Print & transfer', description: 'Heat-transfer printing for compatible textiles, mugs and other suitable materials.' },
] satisfies Array<{ id: string; name: string; category: string; description: string; image?: string }>;

export const activities = [
  { title: 'Build. Test. Make it real.', category: 'PROTOTYPING', tone: 'yellow', description: 'Hands-on learning in 3D modelling, printing, laser engraving and fabrication.' },
  { title: 'Connect the dots.', category: 'ELECTRONICS & CODE', tone: 'blue', description: 'Arduino, microcontrollers, sensors, IoT and programming through practical workshops.' },
  { title: 'Pass the curiosity on.', category: 'COMMUNITY & TRAINING', tone: 'green', description: 'Learning opportunities for students, faculty, schools and the wider community.' },
];
