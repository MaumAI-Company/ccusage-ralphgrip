import { aggregateByModel, parseJsonlFile } from './transcripts.mjs';
import { getPluginVersion } from './config.mjs';

export function buildReport({ config, sessionId, transcriptPath, projectName, reportedAt, utilization }) {
  const entries = parseJsonlFile(transcriptPath);
  if (entries.length === 0) return null;

  const records = aggregateByModel(entries);
  records.forEach((record) => {
    record.projectName = projectName;
  });

  return {
    ...(config.memberName ? { memberName: config.memberName } : {}),
    sessionId,
    records,
    reportedAt: reportedAt || new Date().toISOString(),
    pluginVersion: getPluginVersion(),
    ...(utilization && { utilization }),
  };
}

export function buildReportFromEntries({ config, sessionId, entries, projectName, reportedAt, utilization }) {
  if (entries.length === 0) return null;

  const records = aggregateByModel(entries);
  records.forEach((record) => {
    record.projectName = projectName;
  });

  return {
    ...(config.memberName ? { memberName: config.memberName } : {}),
    sessionId,
    records,
    reportedAt: reportedAt || new Date().toISOString(),
    pluginVersion: getPluginVersion(),
    ...(utilization && { utilization }),
  };
}
