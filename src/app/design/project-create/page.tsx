import {notFound} from 'next/navigation';
import Link from 'next/link';
import {ProjectCreate} from '@/features/projects/project-create';

export const dynamic='force-dynamic';
export const metadata={title:'Project creation design preview',robots:{index:false,follow:false}};
export default function ProjectCreatePreview() {
  if(process.env.ENABLE_DESIGN_PREVIEW!=='true')notFound();
  return <main id="main-content" className="container section narrow"><Link href="/design/student">Back to student preview</Link><p className="eyebrow">DESIGN PREVIEW · NO SUBMISSION</p><h1>Project creation preview.</h1><p>This preview saves retry details in this browser for a sample account. It never submits a project.</p><section className="workspace-card project-editor-panel"><ProjectCreate preview accountId="11111111-1111-4111-8111-111111111111" initialCommandId="22222222-2222-4222-8222-222222222222" /></section></main>;
}
