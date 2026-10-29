import 'server-only';
import { cache } from 'react';
import { requireMember } from './member';
import { serverClient } from './supabase';
import { parseLabOpening, type LabOpeningResult } from './lab-opening';
import { validationFeatureEnabled } from './config';

export const loadLabOpening = cache(async (): Promise<LabOpeningResult> => {
  if (!validationFeatureEnabled('labOpening')) return { status: 'unavailable', opening: null };
  await requireMember();
  const client = await serverClient();
  if (!client) return { status: 'unavailable', opening: null };
  try {
    const result = await client.rpc('get_lab_opening_v1');
    return result.error ? { status: 'unavailable', opening: null } : parseLabOpening(result.data);
  } catch { return { status: 'unavailable', opening: null }; }
});
