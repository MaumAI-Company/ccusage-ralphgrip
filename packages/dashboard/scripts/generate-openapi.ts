import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateOpenAPIDocument } from '../src/lib/schemas/registry';

const __dirname = dirname(fileURLToPath(import.meta.url));
const doc = generateOpenAPIDocument();
const outPath = resolve(__dirname, '..', 'public', 'openapi.json');
writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
console.log(`OpenAPI spec written to ${outPath}`);
