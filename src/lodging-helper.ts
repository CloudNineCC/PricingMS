import pool from './db.js';
import type { LodgingClass } from './types.js';

const nameToIdCache = new Map<string, string>();
const idToNameCache = new Map<string, string>();

export async function initLodgingClassCache() {
  const [rows] = await pool.query<any[]>('SELECT id, name FROM lodging_classes');
  for (const row of rows) {
    nameToIdCache.set(row.name, row.id);
    idToNameCache.set(row.id, row.name);
  }
}

export async function getLodgingClassId(name: LodgingClass): Promise<string | null> {
  if (nameToIdCache.has(name)) {
    return nameToIdCache.get(name)!;
  }

  const [rows] = await pool.query<any[]>(
    'SELECT id FROM lodging_classes WHERE name = ?',
    [name]
  );

  if (rows.length > 0) {
    const id = rows[0].id;
    nameToIdCache.set(name, id);
    idToNameCache.set(id, name);
    return id;
  }

  return null;
}

export async function getLodgingClassName(id: string): Promise<LodgingClass | null> {
  if (idToNameCache.has(id)) {
    return idToNameCache.get(id) as LodgingClass;
  }

  const [rows] = await pool.query<any[]>(
    'SELECT name FROM lodging_classes WHERE id = ?',
    [id]
  );

  if (rows.length > 0) {
    const name = rows[0].name as LodgingClass;
    nameToIdCache.set(name, id);
    idToNameCache.set(id, name);
    return name;
  }

  return null;
}

export async function getAllLodgingClassNames(): Promise<string[]> {
  const [rows] = await pool.query<any[]>('SELECT name FROM lodging_classes ORDER BY name');
  return rows.map((row: any) => row.name);
}
