import test from 'node:test';
import assert from 'node:assert/strict';
import { eventFilter, eventTime, eventPageParams, parseEvents, parseUpcomingEvents, parseEvent } from '../src/features/events/event-contract.ts';
const id='11111111-1111-4111-8111-111111111111', time='2026-10-23T03:30:00Z';
const card=()=>({id,title:'Test event',event_type:'workshop',event_date:time,end_date:null,venue:null,status:'upcoming'});
test('programme links preserve legacy pagination and bind v2 cursors to their filter',()=>{
  assert.deepEqual(eventPageParams({}),{filter:'all',cursor:null,version:2});
  assert.deepEqual(eventPageParams({status:'upcoming',before:time,cursor:id}),{filter:'upcoming',cursor:{event_date:time,id},version:1});
  assert.deepEqual(eventPageParams({status:'upcoming',before:time,cursor:id,order:'2:upcoming'}),{filter:'upcoming',cursor:{event_date:time,id},version:2});
  assert.equal(eventPageParams({status:'completed',before:time,cursor:id,order:'2:upcoming'}),null);
  assert.equal(eventPageParams({status:'upcoming',before:time,cursor:id,order:['2:upcoming']}),null);
  assert.equal(eventPageParams({status:'upcoming',before:time}),null);
  assert.equal(eventPageParams({order:'2:all'}),null);
  assert.equal(eventPageParams({status:['all']}),null);
});
test('events preserve unknown legacy status/type without invented availability',()=>{
  const e={...card(),status:null,event_type:null};
  assert.equal(parseEvents({items:[e],cursor:null},'all').status,'ready');
  assert.equal(parseEvents({items:[e],cursor:null},'upcoming').status,'unavailable');
  for(const extra of ['created_by','user_id','qr_ticket_data','rsvp_count','capacity','payment_status']) assert.equal(parseEvents({items:[{...card(),[extra]:'private'}],cursor:null},'all').status,'unavailable');
});
test('event pages reject malformed filters, private extras, getters and duplicate records',()=>{
  assert.equal(eventFilter('toString'),false);assert.equal(eventFilter(['all']),false);
  assert.equal(parseEvents({items:[],cursor:null},'all').status,'ready');
  assert.equal(parseEvents({items:[card(),card()],cursor:null},'all').status,'unavailable');
  assert.equal(parseEvents({get items(){throw Error('getter');},cursor:null},'all').status,'unavailable');
  assert.equal(parseEvents({items:[{...card(),status:'draft'}],cursor:null},'all').status,'unavailable');
  assert.equal(parseEvents({items:[{...card(),title:'\0private'}],cursor:null},'all').status,'unavailable');
});
test('event seek cursors require a complete bounded page and exact last item',()=>{
  const items=Array.from({length:20},(_,i)=>({...card(),id:`${String(i).padStart(8,'0')}-1111-4111-8111-111111111111`}));
  const cursor={event_date:time,id:items.at(-1).id};
  assert.equal(parseEvents({items,cursor},'all').status,'ready');
  assert.equal(parseEvents({items,cursor:{...cursor,id}},'all').status,'unavailable');
  assert.equal(parseEvents({items:items.slice(1),cursor},'all').status,'unavailable');
  assert.equal(parseEvents({items:[...items,card()],cursor:null},'all').status,'unavailable');
});
test('next-events projection permits only a bounded, cursor-free upcoming list',()=>{
  const items=Array.from({length:4},(_,i)=>({...card(),id:`${String(i).padStart(8,'0')}-1111-4111-8111-111111111111`}));
  assert.equal(parseUpcomingEvents({items:[],cursor:null}).status,'ready');
  assert.equal(parseUpcomingEvents({items:items.slice(0,3),cursor:null}).status,'ready');
  assert.equal(parseUpcomingEvents({items,cursor:null}).status,'unavailable');
  assert.equal(parseUpcomingEvents({items:[{...card(),status:'cancelled'}],cursor:null}).status,'unavailable');
  assert.equal(parseUpcomingEvents({items:[card()],cursor:{event_date:time,id}}).status,'unavailable');
});
test('event details bind identity, support missing and cancelled, and reject unsafe date shapes',()=>{
  assert.equal(parseEvent(null,id).status,'ready');
  assert.equal(parseEvent({...card(),status:'cancelled',description:'<script>plain text</script>'},id).status,'ready');
  assert.equal(parseEvent({...card(),description:null},'22222222-2222-4222-8222-222222222222').status,'unavailable');
  for(const invalid of ['2026-02-30T10:00:00Z','2026-10-23T24:00:00Z','2026-10-23T10:00:00+14:30','infinity','2026-10-23'])assert.equal(eventTime(invalid),false);
  assert.equal(eventTime('2026-10-23T09:00:00+05:30'),true);
});
