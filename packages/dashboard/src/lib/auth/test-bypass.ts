// Test-only auth helpers — config read via AppConfig port.

import { loadAppConfig } from '@/lib/adapters/env-config';

export function isTestBypassEnabled(): boolean {
  return loadAppConfig().testBypassEnabled;
}
