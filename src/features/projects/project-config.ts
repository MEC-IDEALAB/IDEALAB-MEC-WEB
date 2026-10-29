import { backendConfig } from '../../lib/config.ts';

/** The current project contract and browser journal exist only in validation. */
export function projectCoreEnabled(): boolean {
  return process.env.ACCOUNT_ENVIRONMENT === 'validation'
    && process.env.ENABLE_PROJECT_CORE === 'true'
    && backendConfig() !== null;
}
