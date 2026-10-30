import { intake, requestId, type Intake } from './work-request-contract.ts';

export type PendingSubmission = { accountId: string; commandId: string; intake: Intake };
type PendingResult = { status: 'ready'; pending: PendingSubmission } | { status: 'unavailable' };
// This writer is enabled only for the isolated validation project. A future
// production writer must use its own verified backend namespace.
const databaseName = 'idealab-mec-validation-request-journal-v1';
const storeName = 'pending';
const markerPrefix = (accountId: string) => `idealab-mec:validation-pending:v1:${accountId}:`;
function markers(accountId: string): string[] {
  const prefix = markerPrefix(accountId);
  const found: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) found.push(key.slice(prefix.length));
  }
  return found;
}

export function recoverableMarkers(accountId: string): string[] {
  if (!requestId(accountId)) return [];
  try {
    const values = markers(accountId);
    return values.length <= 10 && values.every(requestId) ? values : [];
  } catch { return []; }
}

/** A separate marker detects a missing journal when the marker survives. */
export function markPending(pending: PendingSubmission): boolean {
  try {
    if (markers(pending.accountId).some(marker => marker !== pending.commandId)) return false;
    const key = markerPrefix(pending.accountId) + pending.commandId;
    localStorage.setItem(key, '1');
    return localStorage.getItem(key) === '1';
  } catch { return false; }
}

function parse(value: unknown, accountId: string): PendingSubmission | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).sort().join(',') !== 'accountId,commandId,intake' || row.accountId !== accountId || !requestId(row.commandId)) return null;
  const data = intake(row.intake);
  if (!data || JSON.stringify(data) !== JSON.stringify(row.intake)) return null;
  return { accountId, commandId: row.commandId, intake: data };
}

export async function readPending(accountId: string): Promise<PendingResult | { status: 'empty' }> {
  if (!requestId(accountId)) return { status: 'unavailable' };
  let db: IDBDatabase | undefined;
  try {
    db = await openJournal();
    return await new Promise((resolve, reject) => {
      const tx = db!.transaction(storeName, 'readonly');
      const get = tx.objectStore(storeName).get(accountId);
      get.onsuccess = () => {
        if (get.result === undefined) {
          try { resolve(markers(accountId).length ? { status: 'unavailable' } : { status: 'empty' }); } catch { resolve({ status: 'unavailable' }); }
        }
        else {
          const pending = parse(get.result, accountId);
          try { resolve(pending && markers(accountId).every(marker => marker === pending.commandId) ? { status: 'ready', pending } : { status: 'unavailable' }); }
          catch { resolve({ status: 'unavailable' }); }
        }
      };
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } catch { return { status: 'unavailable' }; } finally { db?.close(); }
}

async function openJournal(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'accountId' });
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error('Journal unavailable')); };
    request.onsuccess = () => { if (blocked) request.result.close(); else resolve(request.result); };
  });
}

/** Atomic account-scoped get-or-create. Never overwrite an uncertain command. */
export async function preparePending(accountId: string, commandId: string, data: Intake): Promise<PendingResult> {
  if (!requestId(accountId) || !requestId(commandId) || !intake(data)) return { status: 'unavailable' };
  let db: IDBDatabase | undefined;
  try {
    db = await openJournal();
    return await new Promise<PendingResult>((resolve, reject) => {
      const tx = db!.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const get = store.get(accountId);
      let pending: PendingSubmission | null = null;
      get.onsuccess = () => {
        let existingMarkers: string[];
        try { existingMarkers = markers(accountId); } catch { tx.abort(); return; }
        if (get.result !== undefined) {
          pending = parse(get.result, accountId);
          if (!pending || existingMarkers.some(marker => marker !== pending!.commandId)) tx.abort();
        } else {
          if (existingMarkers.length) { tx.abort(); return; }
          pending = { accountId, commandId, intake: data };
          store.add(pending);
        }
      };
      tx.oncomplete = () => resolve(pending ? { status: 'ready', pending } : { status: 'unavailable' });
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } catch { return { status: 'unavailable' }; } finally { db?.close(); }
}

/** Delete only the exact confirmed command, never another tab's newer work. */
export async function clearPending(accountId: string, commandId: string): Promise<boolean> {
  let db: IDBDatabase | undefined;
  try {
    db = await openJournal();
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db!.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const get = store.get(accountId);
      let matched = false;
      get.onsuccess = () => {
        const existing = parse(get.result, accountId);
        if (existing?.commandId === commandId) { matched = true; store.delete(accountId); }
      };
      tx.oncomplete = () => {
        if (!matched) { resolve(false); return; }
        try { localStorage.removeItem(markerPrefix(accountId) + commandId); resolve(true); } catch { resolve(false); }
      };
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } catch { return false; } finally { db?.close(); }
}

/** Only call after the server has confirmed this exact owned submit receipt. */
export async function clearConfirmedMarker(accountId: string, commandId: string): Promise<boolean> {
  if (!requestId(accountId) || !requestId(commandId)) return false;
  let db: IDBDatabase | undefined;
  try {
    if (localStorage.getItem(markerPrefix(accountId) + commandId) !== '1') return false;
    db = await openJournal();
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db!.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const get = store.get(accountId);
      let safe = false;
      get.onsuccess = () => {
        if (get.result === undefined) safe = true;
        else {
          const pending = parse(get.result, accountId);
          if (pending) {
            safe = true;
            if (pending.commandId === commandId) store.delete(accountId);
          }
        }
      };
      tx.oncomplete = () => {
        if (!safe) { resolve(false); return; }
        try { localStorage.removeItem(markerPrefix(accountId) + commandId); resolve(true); } catch { resolve(false); }
      };
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } catch { return false; } finally { db?.close(); }
}
