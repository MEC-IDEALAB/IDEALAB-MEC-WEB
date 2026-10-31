export type VercelTelemetryEvent = {
  type: string;
  url: string;
  route?: string;
};

export function isPublicAnalyticsPath(pathname: string | null): boolean;
export function shouldLoadVercelTelemetry(pathname: string | null, vercelEnvironment: string | undefined): boolean;
export function sanitizeVercelEvent<T extends VercelTelemetryEvent>(event: T, origin: string): T | null;
