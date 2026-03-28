// Allowlist service — optional email allowlist check.
// All dependencies injected — no direct imports of adapters or I/O.

import type { AllowlistRepository, AppConfig } from './ports';

export class AllowlistService {
  constructor(
    private allowlist: AllowlistRepository,
    private getConfig: () => AppConfig,
  ) {}

  isEnabled(): boolean {
    return this.getConfig().allowlistEnabled;
  }

  async isEmailAllowed(email: string): Promise<boolean> {
    if (!this.isEnabled()) return true;
    return this.allowlist.isEmailInList(email);
  }
}
