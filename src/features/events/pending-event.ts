import { eventId } from './event-contract.ts';
import { managementRecord, parseEventManagementCommand, type EventManagementCommand } from './management-contract.ts';

export type PendingEvent = { accountId: string; scopeId: string; commandId: string; command: EventManagementCommand };
type ReadResult = { status: 'ready'; pending: PendingEvent } | { status: 'empty' | 'unavailable' };
const databaseName = 'idealab-mec-validation-event-journal-v1', storeName = 'pending';
const marker = (accountId: string) => `idealab-mec:validation-event-pending:v1:${accountId}`;
function parse(value: unknown, accountId: string): PendingEvent | null {
  try {
    if (!managementRecord(value, ['accountId', 'scopeId', 'commandId', 'command']) || value.accountId !== accountId
      || !eventId(accountId) || !eventId(value.scopeId) || !eventId(value.commandId)) return null;
    const command = parseEventManagementCommand(value.command);
    return command && (command.action !== 'create' || command.scope_id === value.scopeId) ? value as PendingEvent : null;
  } catch { return null; }
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1); let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'accountId' });
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error('Event journal unavailable')); };
    request.onsuccess = () => { if (blocked) request.result.close(); else resolve(request.result); };
  });
}
export async function readPendingEvent(accountId: string): Promise<ReadResult> {
  if (!eventId(accountId)) return { status: 'unavailable' };
  let database: IDBDatabase | undefined;
  try {
    database = await open();
    return await new Promise((resolve, reject) => {
      const tx = database!.transaction(storeName, 'readonly'), request = tx.objectStore(storeName).get(accountId);
      let result: ReadResult = { status: 'unavailable' };
      request.onsuccess = () => {
        try {
          const token = localStorage.getItem(marker(accountId));
          if (request.result === undefined) result = { status: token ? 'unavailable' : 'empty' };
          else {
            const pending = parse(request.result, accountId);
            if (pending && (!token || token === pending.commandId)) result = { status: 'ready', pending };
          }
        } catch { /* Keep unavailable; never assume an uncertain write failed. */ }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } catch { return { status: 'unavailable' }; } finally { database?.close(); }
}
/** Cross-tab get-or-create; never overwrite an earlier unresolved command. */
export async function preparePendingEvent(value: PendingEvent): Promise<ReadResult> {
  if (!parse(value, value.accountId)) return { status: 'unavailable' };
  let database: IDBDatabase | undefined;
  try {
    database = await open();
    return await new Promise((resolve, reject) => {
      const tx = database!.transaction(storeName, 'readwrite'), store = tx.objectStore(storeName), request = store.get(value.accountId);
      let pending: PendingEvent | null = null;
      request.onsuccess = () => {
        try {
          const token = localStorage.getItem(marker(value.accountId));
          if (request.result === undefined) {
            if (token) { tx.abort(); return; }
            pending = value; store.add(value);
          } else {
            pending = parse(request.result, value.accountId);
            if (!pending || token && token !== pending.commandId) tx.abort();
          }
        } catch { tx.abort(); }
      };
      tx.oncomplete = () => resolve(pending ? { status: 'ready', pending } : { status: 'unavailable' });
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } catch { return { status: 'unavailable' }; } finally { database?.close(); }
}
/** The write is dispatched only after durable journal and marker succeed. */
export function markPendingEvent(value: PendingEvent): boolean {
  if (!parse(value, value.accountId)) return false;
  try {
    const old = localStorage.getItem(marker(value.accountId));
    if (old && old !== value.commandId) return false;
    localStorage.setItem(marker(value.accountId), value.commandId);
    return localStorage.getItem(marker(value.accountId)) === value.commandId;
  } catch { return false; }
}
/** Call only after the server confirmed this exact command. */
export async function clearPendingEvent(accountId: string, commandId: string): Promise<boolean> {
  if (!eventId(accountId) || !eventId(commandId)) return false;
  let database: IDBDatabase | undefined;
  try {
    database = await open();
    return await new Promise((resolve, reject) => {
      const tx = database!.transaction(storeName, 'readwrite'), store = tx.objectStore(storeName), request = store.get(accountId);
      let matched = false;
      request.onsuccess = () => {
        // Another tab may already have confirmed and removed the same row.
        // The exact matching marker is still required before cleanup below.
        if (request.result === undefined) { matched = true; return; }
        const pending = parse(request.result, accountId);
        if (pending?.commandId === commandId) { matched = true; store.delete(accountId); }
      };
      tx.oncomplete = () => {
        try {
          if (!matched || localStorage.getItem(marker(accountId)) !== commandId) { resolve(false); return; }
          localStorage.removeItem(marker(accountId)); resolve(true);
        } catch { resolve(false); }
      };
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } catch { return false; } finally { database?.close(); }
}
