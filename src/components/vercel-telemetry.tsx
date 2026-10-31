'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { usePathname } from 'next/navigation';
import { sanitizeVercelEvent, shouldLoadVercelTelemetry } from '@/lib/vercel-telemetry.mjs';

export function VercelTelemetry({ vercelEnvironment }: { vercelEnvironment?: string }) {
  const pathname = usePathname();
  if (!shouldLoadVercelTelemetry(pathname, vercelEnvironment)) return null;

  const beforeSend = <T extends { type: string; url: string; route?: string }>(event: T) =>
    sanitizeVercelEvent(event, window.location.origin);

  return <><Analytics beforeSend={beforeSend} /><SpeedInsights beforeSend={beforeSend} /></>;
}
