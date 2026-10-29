import 'server-only';
import { cache } from 'react';
import { requireMember } from './member';
import { serverClient } from './supabase';
import { parseOwnVisits, type OwnVisitsResult } from './own-visits';
import { validationFeatureEnabled } from './config';

export const loadOwnVisits = cache(async (): Promise<OwnVisitsResult> => {
  if (!validationFeatureEnabled('ownVisits')) return { status: 'unavailable', visits: null };
  const { user } = await requireMember();
  const client = await serverClient();
  if (!client) return { status: 'unavailable', visits: null };
  try {
    const { data, error } = await client.rpc('get_own_lab_visits_v1');
    return error ? { status: 'unavailable', visits: null } : parseOwnVisits(data, user.id);
  } catch { return { status: 'unavailable', visits: null }; }
});
