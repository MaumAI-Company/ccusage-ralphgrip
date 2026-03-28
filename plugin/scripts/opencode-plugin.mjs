import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PLUGIN_BASE_DIR = join(
  homedir(),
  '.claude',
  'plugins',
  'cache',
  'ralphgrip',
  'ccusage-ralphgrip',
);
const IDLE_SYNC_DELAY_MS = 65_000;

export function resolvePluginRoot() {
  if (!existsSync(PLUGIN_BASE_DIR)) return null;

  const versions = readdirSync(PLUGIN_BASE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  if (versions.length === 0) return null;
  return join(PLUGIN_BASE_DIR, versions[versions.length - 1]);
}

export function resolveSyncTriggerSessionId(event) {
  if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
    return null;
  }

  const normalizeSessionId = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.startsWith('ses_') ? trimmed : null;
  };

  const pickSessionId = (payload) => {
    if (!payload || typeof payload !== 'object') return null;

    return normalizeSessionId(
      payload.sessionID
      || payload.sessionId
      || payload.session_id
      || payload.id
      || payload.session?.id
      || payload.session?.sessionID
      || payload.session?.sessionId
      || payload.session?.session_id
    );
  };

  if (event.type === 'session.idle') {
    return pickSessionId(event.properties);
  }

  if (event.type === 'message.updated') {
    const info = event.properties?.info;
    if (!info || info.role !== 'assistant') return null;
    return pickSessionId(info);
  }

  return null;
}

async function runOpenCodeCatchup(pluginRoot, sessionId) {
  const moduleUrl = pathToFileURL(join(pluginRoot, 'scripts', 'catchup.mjs')).href;
  const catchupModule = await import(moduleUrl);

  if (typeof catchupModule.runOpenCodeCatchup !== 'function') {
    throw new Error('OpenCode catch-up entrypoint is unavailable.');
  }

  await catchupModule.runOpenCodeCatchup(undefined, { sessionId });
}

export const ccusageWorv = async ({ client }) => {
  const sessionTimers = new Map();

  const logError = async (message, error) => {
    if (!client?.app?.log) return;

    try {
      await client.app.log({
        body: {
          service: 'ccusage-ralphgrip',
          level: 'error',
          message,
          extra: {
            ...(error instanceof Error ? { error: error.message } : {}),
          },
        },
      });
    } catch {
      // ignore logging failures
    }
  };

  const syncSession = async (sessionId) => {
    const pluginRoot = resolvePluginRoot();
    if (!pluginRoot) {
      const message = '[ccusage-ralphgrip] Plugin cache not found.';
      console.error(message);
      await logError(message);
      return;
    }

    try {
      await runOpenCodeCatchup(pluginRoot, sessionId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const message = `[ccusage-ralphgrip] OpenCode sync failed for ${sessionId}: ${reason}`;
      console.error(message);
      await logError(message, error);
    }
  };

  const scheduleSync = (sessionId) => {
    const existingTimer = sessionTimers.get(sessionId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      sessionTimers.delete(sessionId);
      void syncSession(sessionId);
    }, IDLE_SYNC_DELAY_MS);

    sessionTimers.set(sessionId, timer);
  };

  return {
    event: async ({ event }) => {
      const sessionId = resolveSyncTriggerSessionId(event);
      if (!sessionId) return;

      if (event.type === 'session.idle') {
        const existingTimer = sessionTimers.get(sessionId);
        if (existingTimer) {
          clearTimeout(existingTimer);
          sessionTimers.delete(sessionId);
        }
        await syncSession(sessionId);
        return;
      }

      scheduleSync(sessionId);
    },
  };
};
