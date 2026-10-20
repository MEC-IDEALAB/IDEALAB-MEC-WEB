import Image from 'next/image';
import { facilities } from '@/content/lab';

export function FacilityCards({ preview = false }: { preview?: boolean }) {
  const entries = preview ? facilities.slice(0, 3) : facilities;
  return <div className="facility-grid">{entries.map((facility, index) => <article className="facility-card" key={facility.id} id={`facility-${facility.id}`} data-reveal="card" data-stagger={index % 3}>
    {'image' in facility && facility.image && <div className="facility-media"><Image src={facility.image} width={200} height={200} alt={facility.name} sizes="200px" /></div>}
    <div className="facility-copy"><span className="facility-category">{facility.category}</span><h3>{facility.name}</h3><p>{facility.description}</p></div>
  </article>)}</div>;
}
