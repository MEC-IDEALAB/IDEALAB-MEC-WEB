import { requireMember } from '@/lib/member';
import { RequestWorkspace } from '@/features/requests/request-workspace';
import { SubmittedRequests } from '@/features/requests/submitted-requests';
import { requestId,requestTime,type RequestCursor } from '@/features/requests/work-request-contract';
export const metadata = { title: 'Work requests' };
export default async function RequestsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const { user,profile } = await requireMember();const params=await searchParams;
  const invalid=(params.before!==undefined||params.cursor!==undefined)&&(!requestTime(params.before)||!requestId(params.cursor));
  const cursor:RequestCursor|null=!invalid&&requestTime(params.before)&&requestId(params.cursor)?{created_at:params.before,id:params.cursor}:null;
  return <div className="workspace-page"><span className="eyebrow">FROM IDEA TO NEXT STEP</span><h1>Your work requests.</h1><p>Keep device-local drafts separate from submitted requests.</p><RequestWorkspace accountId={user.id} composeHref="/app/requests/new" submitted={process.env.ACCOUNT_ENVIRONMENT==='validation'&&process.env.ENABLE_WORK_REQUEST_INTAKE==='true'&&profile.role==='student'?<SubmittedRequests cursor={cursor} invalid={invalid}/>:undefined} /></div>;
}
