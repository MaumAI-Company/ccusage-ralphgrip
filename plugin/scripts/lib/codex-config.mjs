function countBrackets(source) {
  let depth = 0;
  for (const char of source) {
    if (char === '[') depth += 1;
    if (char === ']') depth -= 1;
  }
  return depth;
}

export function stringifyTomlStringArray(values) {
  return `[${values.map(value => JSON.stringify(value)).join(', ')}]`;
}

export function extractTopLevelNotifyCommand(content) {
  const lines = content.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('[')) break;
    if (!/^notify\s*=/.test(trimmed)) continue;

    const startLine = index;
    const valueStart = lines[index].indexOf('=');
    if (valueStart < 0) {
      return { value: null, startLine, endLine: index };
    }

    let endLine = index;
    let rawValue = lines[index].slice(valueStart + 1).trim();
    let bracketDepth = countBrackets(rawValue);

    while (bracketDepth > 0 && endLine + 1 < lines.length) {
      endLine += 1;
      rawValue += `\n${lines[endLine].trim()}`;
      bracketDepth += countBrackets(lines[endLine]);
    }

    const arrayMatch = rawValue.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
      return { value: null, startLine, endLine };
    }

    try {
      return {
        value: JSON.parse(arrayMatch[0]),
        startLine,
        endLine,
      };
    } catch {
      return {
        value: null,
        startLine,
        endLine,
      };
    }
  }

  return {
    value: null,
    startLine: -1,
    endLine: -1,
  };
}

export function updateTopLevelNotifyCommand(content, command) {
  const lines = content.split('\n');
  const replacement = `notify = ${stringifyTomlStringArray(command)}`;
  const existing = extractTopLevelNotifyCommand(content);

  if (existing.startLine >= 0) {
    lines.splice(existing.startLine, (existing.endLine - existing.startLine) + 1, replacement);
    return `${lines.join('\n').replace(/\n*$/, '\n')}`;
  }

  let insertAt = 0;
  while (insertAt < lines.length) {
    const trimmed = lines[insertAt].trim();
    if (trimmed.startsWith('[')) break;
    insertAt += 1;
  }

  if (insertAt === 0) {
    return `${replacement}\n${content}`.replace(/\n*$/, '\n');
  }

  lines.splice(insertAt, 0, replacement);
  return `${lines.join('\n').replace(/\n*$/, '\n')}`;
}
