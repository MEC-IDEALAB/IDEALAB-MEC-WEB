export type ProjectStage = 'ideation' | 'in_progress' | 'completed' | 'showcase';
export type ProjectCard = Readonly<{ id: string; title: string; description: string | null; status: ProjectStage; visibility: 'public' | 'private' | 'club'; created_at: string; updated_at: string; revision: string; relation: 'creator' | 'member' | 'none'; member_count: number }>;
export type ProjectCursor = Readonly<{ updated_at: string; id: string }>;
export type ProjectList = Readonly<{ items: ProjectCard[]; cursor: ProjectCursor | null }>;
export type ProjectMember = Readonly<{ id: string; role: 'admin' | 'lead' | 'member' | 'mentor'; is_self: boolean; joined_at: string }>;
export type PendingProjectRequest = Readonly<{ id: string; revision: string; created_at: string }>;
export type ProjectDetail = Readonly<{ project: ProjectCard; join_code: string | null; members: ProjectMember[]; requests: PendingProjectRequest[]; pending_count: number }>;
export type OwnProjectRequest = Readonly<{ id: string; status: 'pending' | 'approved' | 'declined' | 'cancelled'; revision: string; created_at: string; updated_at: string; project_id: string | null; project_title: string | null }>;
export type ProjectRead<T> = { status: 'ready'; data: T } | { status: 'unavailable'; data: null };
export const stages = { ideation: 'Ideation', in_progress: 'In progress', completed: 'Completed', showcase: 'Showcase' } as const;
export const isProjectId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const isProjectRevision = (value: unknown): value is string => typeof value === 'string' && /^[1-9][0-9]{0,18}$/.test(value) && (value.length < 19 || value <= '9223372036854775807');
export const isProjectTime = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
export function projectRecord(value: unknown, fields: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(value).length === fields.length && fields.every(field => descriptors[field]?.enumerable && 'value' in descriptors[field]);
}
export function projectText(value: unknown, max: number, multiline = false, blank = false): value is string {
  return typeof value === 'string' && value.length <= max * 2 && (blank || !!value.trim()) && Array.from(value).length <= max
    && !Array.from(value).some(c => { const n = c.charCodeAt(0); return (n < 32 && !(multiline && [9,10,13].includes(n))) || (n >= 127 && n <= 159); });
}
function card(value: unknown): ProjectCard | null {
  if (!projectRecord(value, ['id','title','description','status','visibility','created_at','updated_at','revision','relation','member_count'])
    || !isProjectId(value.id) || !projectText(value.title,160) || (value.description !== null && !projectText(value.description,4000,true,true))
    || typeof value.status!=='string' || !Object.hasOwn(stages,value.status) || !['public','private','club'].includes(value.visibility as string)
    || !isProjectTime(value.created_at) || !isProjectTime(value.updated_at) || !isProjectRevision(value.revision)
    || !['creator','member','none'].includes(value.relation as string) || !Number.isSafeInteger(value.member_count) || (value.member_count as number)<1) return null;
  if (value.visibility !== 'public' && value.relation === 'none') return null;
  return value as unknown as ProjectCard;
}
const unavailable = { status: 'unavailable', data: null } as const;
export function parseProjectList(value: unknown, view: 'mine' | 'discover'): ProjectRead<ProjectList> {
  try {
    if (!projectRecord(value,['items','cursor']) || !Array.isArray(value.items) || value.items.length>20) return unavailable;
    const items: ProjectCard[]=[]; const ids=new Set<string>();
    for(const row of value.items) { const item=card(row); if(!item || ids.has(item.id) || (view==='discover' && item.visibility!=='public') || (view==='mine' && item.relation==='none')) return unavailable; ids.add(item.id); items.push(item); }
    let cursor: ProjectCursor | null=null;
    if(value.cursor!==null) {
      if(!projectRecord(value.cursor,['updated_at','id']) || !isProjectTime(value.cursor.updated_at) || !isProjectId(value.cursor.id) || items.length!==20
        || items.at(-1)?.id!==value.cursor.id || items.at(-1)?.updated_at!==value.cursor.updated_at) return unavailable;
      cursor=value.cursor as unknown as ProjectCursor;
    }
    return {status:'ready',data:{items,cursor}};
  } catch { return unavailable; }
}
export function parseProjectDetail(value: unknown, expectedId: string): ProjectRead<ProjectDetail | null> {
  try {
    if(value===null) return {status:'ready',data:null};
    if(!projectRecord(value,['project','join_code','members','requests','pending_count'])) return unavailable;
    const project=card(value.project);
    if(!project || project.id!==expectedId || !Array.isArray(value.members) || value.members.length>50 || !Array.isArray(value.requests) || value.requests.length>20
      || !Number.isSafeInteger(value.pending_count) || (value.pending_count as number)<value.requests.length) return unavailable;
    const creator=project.relation==='creator', team=project.relation!=='none';
    if(creator ? typeof value.join_code!=='string' || !/^[A-F0-9]{32}$/.test(value.join_code) : value.join_code!==null || value.pending_count!==0 || value.requests.length!==0) return unavailable;
    if(!team && value.members.length!==0) return unavailable;
    if(team && value.members.length!==Math.min(50,project.member_count)) return unavailable;
    const ids=new Set<string>();
    for(const m of value.members) {
      if(!projectRecord(m,['id','role','is_self','joined_at']) || !isProjectId(m.id) || ids.has(m.id) || !['admin','lead','member','mentor'].includes(m.role as string)
        || typeof m.is_self!=='boolean' || !isProjectTime(m.joined_at)) return unavailable;
      ids.add(m.id);
    }
    const requestIds=new Set<string>();
    for(const r of value.requests) {
      if(!projectRecord(r,['id','revision','created_at']) || !isProjectId(r.id) || requestIds.has(r.id) || !isProjectRevision(r.revision) || !isProjectTime(r.created_at)) return unavailable;
      requestIds.add(r.id);
    }
    return {status:'ready',data:{project,join_code:value.join_code as string|null,members:value.members as ProjectMember[],requests:value.requests as PendingProjectRequest[],pending_count:value.pending_count as number}};
  } catch { return unavailable; }
}
export function parseOwnProjectRequests(value: unknown): ProjectRead<OwnProjectRequest[]> {
  try {
    if(!Array.isArray(value) || value.length>20) return unavailable;
    const ids=new Set<string>(); const result: OwnProjectRequest[]=[];
    for(const r of value) {
      if(!projectRecord(r,['id','status','revision','created_at','updated_at','project_id','project_title']) || !isProjectId(r.id) || ids.has(r.id)
        || !['pending','approved','declined','cancelled'].includes(r.status as string) || !isProjectRevision(r.revision) || !isProjectTime(r.created_at) || !isProjectTime(r.updated_at)
        || (r.project_id===null ? r.project_title!==null : !isProjectId(r.project_id) || !projectText(r.project_title,160))) return unavailable;
      ids.add(r.id); result.push(r as unknown as OwnProjectRequest);
    }
    return {status:'ready',data:result};
  } catch { return unavailable; }
}
