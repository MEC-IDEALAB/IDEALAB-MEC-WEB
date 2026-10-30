import { isProjectId, isProjectRevision, projectRecord, projectText } from './project-contract.ts';
export type ProjectKind = 'create' | 'update' | 'rotate_code' | 'join' | 'decide' | 'cancel' | 'leave';
export type ProjectActionState = Readonly<{ status: 'idle' | 'saved' | 'error'; message: string; projectId?: string; revision?: string }>;
/** Missing or malformed receipts remain unresolved; they never establish failure. */
export function confirmedProjectCreateReceipt(value: unknown): string | null {
  try {
    return projectRecord(value,['status','project_id']) && value.status==='saved' && isProjectId(value.project_id) ? value.project_id : null;
  } catch { return null; }
}
const fields: Record<ProjectKind,string[]> = {create:['title','description','visibility'],update:['project_id','expected_revision','title','description','visibility','stage'],rotate_code:['project_id','expected_revision'],join:['code'],decide:['request_id','expected_revision','decision'],cancel:['request_id','expected_revision'],leave:['project_id']};
export function buildProjectCommand(form: FormData) {
  const kind=form.get('kind'), commandId=form.get('command_id');
  if(typeof kind!=='string' || !Object.hasOwn(fields,kind) || form.getAll('kind').length!==1 || form.getAll('command_id').length!==1 || !isProjectId(commandId)) return null;
  const command: Record<string,string>={kind};
  for(const field of fields[kind as ProjectKind]) {
    const value=form.get(field); if(typeof value!=='string' || form.getAll(field).length!==1) return null;
    command[field]=field==='code' ? value.replace(/[\s-]/gu,'').toUpperCase() : ['title','description'].includes(field) ? value.trim() : value;
  }
  if(('project_id' in command && !isProjectId(command.project_id)) || ('request_id' in command && !isProjectId(command.request_id)) || ('expected_revision' in command && !isProjectRevision(command.expected_revision))) return null;
  if(['create','update'].includes(kind) && (!projectText(command.title,160) || !projectText(command.description,4000,true) || !['public','private'].includes(command.visibility))) return null;
  if(kind==='update' && !['ideation','in_progress','completed','showcase'].includes(command.stage)) return null;
  if(kind==='join' && !/^[A-F0-9]{32}$/.test(command.code)) return null;
  if(kind==='decide' && !['approve','decline'].includes(command.decision)) return null;
  return {kind:kind as ProjectKind,p_command:command,p_command_id:commandId};
}
export function parseProjectAction(value: unknown, kind: ProjectKind): ProjectActionState {
  try {
    if(['create','update','rotate_code'].includes(kind) && projectRecord(value,['status','project_id','revision']) && value.status==='saved' && isProjectId(value.project_id) && isProjectRevision(value.revision))
      return {status:'saved',message:'Your project request was processed. Check the saved project details.',projectId:value.project_id,revision:value.revision};
    if(['decide','cancel'].includes(kind) && projectRecord(value,['status','project_id']) && value.status==='saved' && (isProjectId(value.project_id) || (kind==='cancel' && value.project_id===null)))
      return {status:'saved',message:'Your decision was recorded. The latest request status is shown on this page.'};
    if(kind==='join' && projectRecord(value,['status','request_id']) && value.status==='requested' && isProjectId(value.request_id))
      return {status:'saved',message:'Your request was recorded. Membership requires the creator’s approval.'};
    if(kind==='join' && projectRecord(value,['status','project_id']) && value.status==='already_member' && isProjectId(value.project_id))
      return {status:'saved',message:'You already belong to this project.',projectId:value.project_id};
    if(kind==='leave' && projectRecord(value,['status']) && value.status==='left') return {status:'saved',message:'Your leave request was processed. Check My projects for your current memberships.'};
    if(projectRecord(value,['status'])) {
      const messages: Record<string,string>={conflict:'This record or command changed. Review the saved version before trying again.',denied:'This action is not available to your account.',invalid:'Check the form fields and their limits.',request_unavailable:'We couldn’t create a request with that code. Check the code with the creator.',try_later:'Too many join-code attempts. Wait fifteen minutes before trying again.',creator_must_remain:'The creator must remain responsible for this project. Ownership transfer is not available here.',applicant_unavailable:'This request cannot be approved while the applicant is ineligible. No membership was granted.'};
      if(typeof value.status==='string' && Object.hasOwn(messages,value.status)) return {status:'error',message:messages[value.status]};
    }
  } catch { /* Malformed responses cannot claim success. */ }
  return {status:'error',message:'We couldn’t confirm this update. Check the saved project and requests before retrying the same action.'};
}
