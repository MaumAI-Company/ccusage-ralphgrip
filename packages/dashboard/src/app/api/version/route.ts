import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

let cachedVersion: string | null = null;

function getLatestPluginVersion(): string {
  if (cachedVersion) return cachedVersion;
  try {
    const pluginJson = JSON.parse(
      readFileSync(join(process.cwd(), '../../plugin/.claude-plugin/plugin.json'), 'utf-8'),
    );
    cachedVersion = pluginJson.version || 'unknown';
  } catch {
    cachedVersion = 'unknown';
  }
  return cachedVersion!;
}

export async function GET() {
  return NextResponse.json({
    latestVersion: getLatestPluginVersion(),
  });
}
