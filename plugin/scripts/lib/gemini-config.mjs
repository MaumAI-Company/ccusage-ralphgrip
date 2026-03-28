export const GEMINI_CCUSAGE_HOOK_NAME = 'ccusage-ralphgrip-session-end';

function cloneSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return {};
  }
  return JSON.parse(JSON.stringify(settings));
}

function isManagedHook(hook, command) {
  if (!hook || typeof hook !== 'object') return false;
  return hook.name === GEMINI_CCUSAGE_HOOK_NAME || hook.command === command;
}

export function createGeminiSessionEndHook(command) {
  return {
    hooks: [{
      name: GEMINI_CCUSAGE_HOOK_NAME,
      description: 'Sync Gemini CLI usage to ccusage-ralphgrip after each session.',
      type: 'command',
      command,
      timeout: 15000,
    }],
  };
}

export function hasGeminiSessionEndHook(settings, command) {
  const events = settings?.hooks?.SessionEnd;
  if (!Array.isArray(events)) return false;

  return events.some((definition) => Array.isArray(definition?.hooks)
    && definition.hooks.some((hook) => isManagedHook(hook, command)));
}

export function updateGeminiSettings(settings, command) {
  const next = cloneSettings(settings);
  if (!next.hooks || typeof next.hooks !== 'object' || Array.isArray(next.hooks)) {
    next.hooks = {};
  }

  const existingSessionEnd = Array.isArray(next.hooks.SessionEnd)
    ? next.hooks.SessionEnd.map((definition) => {
      if (!definition || typeof definition !== 'object') return definition;
      return {
        ...definition,
        ...(Array.isArray(definition.hooks) ? { hooks: [...definition.hooks] } : {}),
      };
    })
    : [];

  let replaced = false;
  const updatedSessionEnd = existingSessionEnd.map((definition) => {
    if (!Array.isArray(definition?.hooks)) return definition;

    let changed = false;
    const hooks = definition.hooks.map((hook) => {
      if (!isManagedHook(hook, command)) return hook;
      changed = true;
      replaced = true;
      return createGeminiSessionEndHook(command).hooks[0];
    });

    return changed ? { ...definition, hooks } : definition;
  });

  if (!replaced) {
    updatedSessionEnd.push(createGeminiSessionEndHook(command));
  }

  next.hooks.SessionEnd = updatedSessionEnd;
  next.hooksConfig = {
    ...(next.hooksConfig && typeof next.hooksConfig === 'object' && !Array.isArray(next.hooksConfig)
      ? next.hooksConfig
      : {}),
    enabled: true,
  };

  return next;
}
