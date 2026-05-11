import * as schema from './drizzle/schema';
import { getTableConfig } from 'drizzle-orm/pg-core';

for (const [key, value] of Object.entries(schema)) {
  if (typeof value === 'object' && value !== null && 'id' in value) {
    try {
      const config = getTableConfig(value as any);
      console.log(`Table: ${config.name}`);
      config.indexes.forEach(idx => {
          // @ts-ignore
        console.log(`  Index: ${idx.config.name}`);
      });
    } catch (e) {}
  }
}
