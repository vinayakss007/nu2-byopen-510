
import { TABLE_REGISTRY } from './drizzle/schema/_registry';

console.log('--- Drizzle Schema Issue Scan ---');

const issues: string[] = [];

for (const [tableName, entry] of Object.entries(TABLE_REGISTRY)) {
  const metadata = entry.metadata;
  
  if (!metadata.hasSoftDelete) {
    issues.push(`[${tableName}] Missing hasSoftDelete`);
  }
  
  if (!metadata.hasAudit) {
    issues.push(`[${tableName}] Missing hasAudit`);
  }
  
  if (!metadata.hasMetadata) {
    issues.push(`[${tableName}] Missing hasMetadata`);
  }
  
  if (metadata.indexes.length === 0) {
    issues.push(`[${tableName}] No indexes defined in registry`);
  }
}

console.log(`Found ${issues.length} potential issues in registry.`);
issues.slice(0, 20).forEach(issue => console.log(issue));
if (issues.length > 20) console.log('...');
