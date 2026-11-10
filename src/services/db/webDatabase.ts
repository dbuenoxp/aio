import AsyncStorage from '@react-native-async-storage/async-storage';

const WEB_STORAGE_KEY = 'aio_web_sqlite_db_v3_clean';

export interface WebDatabaseTables {
  users: any[];
  fitness_profile: any[];
  weight_entries: any[];
  water_logs: any[];
  tasks: any[];
  goals: any[];
  milestones: any[];
  transactions: any[];
  workout_entries: any[];
  [key: string]: any[];
}

function getInitialData(): WebDatabaseTables {
  const now = new Date();
  const nowIso = now.toISOString();
  const todayStr = nowIso.split('T')[0];

  return {
    users: [
      {
        id: 'usr-dbueno',
        username: 'dbueno',
        name: 'Diego Bueno',
        email: 'dbueno@aio.app',
        password_hash: 'admin1414',
        is_guest: 0,
        biometrics_enabled: 1,
        avatar_url: null,
        created_at: nowIso,
      },
    ],
    fitness_profile: [
      {
        id: 'default_profile',
        current_weight: 70.0,
        target_weight: 68.0,
        initial_weight: 70.0,
        height: 175.0,
        unit: 'kg',
        hydration_reminder_hours: 2,
        hydration_reminder_enabled: 1,
        workout_reminder_time: '07:30',
        workout_reminder_enabled: 1,
      },
    ],
    weight_entries: [],
    water_logs: [
      {
        id: `water-${todayStr}`,
        date: todayStr,
        glasses: 0,
        target_glasses: 8,
        amount_ml: 0,
        updated_at: nowIso,
      },
    ],
    tasks: [],
    goals: [],
    milestones: [],
    transactions: [],
    workout_entries: [],
  };
}

class WebSQLiteDatabase {
  private tables: WebDatabaseTables | null = null;
  private loadPromise: Promise<WebDatabaseTables> | null = null;

  private async getTables(): Promise<WebDatabaseTables> {
    if (this.tables) return this.tables;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(WEB_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const initial = getInitialData();
          // Merge to ensure missing tables exist
          const merged: WebDatabaseTables = { ...initial, ...parsed };

          // Always ensure dbueno exists
          const adminExists = merged.users.some(
            (u) => u.username === 'dbueno' || u.email === 'dbueno@aio.app'
          );
          if (!adminExists) {
            merged.users.push(initial.users[0]);
          } else {
            const admin = merged.users.find(
              (u) => u.username === 'dbueno' || u.email === 'dbueno@aio.app'
            );
            if (admin) {
              admin.username = 'dbueno';
              admin.password_hash = 'admin1414';
              if (admin.name === 'dbueno' || admin.name === 'Daniel Bueno') {
                admin.name = 'Diego Bueno';
              }
            }
          }

          // Migrate old default USD transactions to PEN if no PEN transactions exist yet
          if (
            Array.isArray(merged.transactions) &&
            !merged.transactions.some((t: any) => t.currency === 'PEN')
          ) {
            merged.transactions = merged.transactions.map((t: any) => ({
              ...t,
              currency: 'PEN',
            }));
            await this.saveTables(merged);
          }

          this.tables = merged;
          return merged;
        }
      } catch {
        // fallback
      }

      const initial = getInitialData();
      this.tables = initial;
      await this.saveTables(initial);
      return initial;
    })();

    return this.loadPromise;
  }

  private async saveTables(tables: WebDatabaseTables): Promise<void> {
    try {
      await AsyncStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(tables));
    } catch {
      // ignore
    }
  }

  public async execAsync(_sql: string): Promise<void> {
    // DDL statements (CREATE TABLE, ALTER TABLE) are handled in-memory
    await this.getTables();
  }

  public async getFirstAsync<T>(sql: string, ...params: any[]): Promise<T | null> {
    const list = await this.getAllAsync<T>(sql, ...params);
    return list.length > 0 ? list[0] : null;
  }

  public async getAllAsync<T>(sql: string, ...params: any[]): Promise<T[]> {
    const tables = await this.getTables();
    const cleanSql = sql.replace(/\s+/g, ' ').trim();

    // Extract table name
    const fromMatch = cleanSql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    if (!fromMatch) return [];
    const tableName = fromMatch[1].toLowerCase();

    let rows: any[] = tables[tableName] ? [...tables[tableName]] : [];

    // Filter with WHERE if present
    const whereMatch = cleanSql.match(/WHERE\s+(.+?)(?:\s+ORDER BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      rows = rows.filter((row) => this.evaluateWhere(row, whereClause, params));
    }

    // Sort with ORDER BY if present
    const orderMatch = cleanSql.match(/ORDER BY\s+(.+?)(?:\s+LIMIT|$)/i);
    if (orderMatch) {
      rows = this.sortRows(rows, orderMatch[1]);
    }

    // Slice with LIMIT if present
    const limitMatch = cleanSql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      rows = rows.slice(0, parseInt(limitMatch[1], 10));
    }

    return rows as T[];
  }

  public async runAsync(
    sql: string,
    ...params: any[]
  ): Promise<{ lastInsertRowId: number; changes: number }> {
    const tables = await this.getTables();
    const cleanSql = sql.replace(/\s+/g, ' ').trim();

    // 1. INSERT INTO
    if (/^INSERT INTO/i.test(cleanSql)) {
      const insertMatch = cleanSql.match(
        /^INSERT INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)(.*)$/i
      );
      if (insertMatch) {
        const tableName = insertMatch[1].toLowerCase();
        const columns = insertMatch[2].split(',').map((c) => c.trim().toLowerCase());
        const hasOnConflict = /ON CONFLICT/i.test(insertMatch[4]);

        const newRow: Record<string, any> = {};
        columns.forEach((col, idx) => {
          newRow[col] = params[idx];
        });

        if (!tables[tableName]) {
          tables[tableName] = [];
        }

        if (hasOnConflict && tableName === 'water_logs' && newRow.date) {
          const idx = tables[tableName].findIndex((r) => r.date === newRow.date);
          if (idx !== -1) {
            tables[tableName][idx] = { ...tables[tableName][idx], ...newRow };
          } else {
            tables[tableName].push(newRow);
          }
        } else if (newRow.id) {
          const idx = tables[tableName].findIndex((r) => r.id === newRow.id);
          if (idx !== -1) {
            tables[tableName][idx] = { ...tables[tableName][idx], ...newRow };
          } else {
            tables[tableName].push(newRow);
          }
        } else {
          tables[tableName].push(newRow);
        }

        await this.saveTables(tables);
        return { lastInsertRowId: 1, changes: 1 };
      }
    }

    // 2. UPDATE
    if (/^UPDATE/i.test(cleanSql)) {
      const updateMatch = cleanSql.match(/^UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (updateMatch) {
        const tableName = updateMatch[1].toLowerCase();
        const setPart = updateMatch[2];
        const wherePart = updateMatch[3] || '';

        const assignments = setPart.split(',').map((s) => s.trim());
        let paramIdx = 0;
        const updates: Record<string, any> = {};

        for (const assign of assignments) {
          const assignMatch = assign.match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
          if (assignMatch) {
            const col = assignMatch[1].toLowerCase();
            const valExpr = assignMatch[2].trim();
            if (valExpr === '?') {
              updates[col] = params[paramIdx++];
            } else if (valExpr.startsWith("'") && valExpr.endsWith("'")) {
              updates[col] = valExpr.slice(1, -1);
            } else if (!isNaN(Number(valExpr))) {
              updates[col] = Number(valExpr);
            } else {
              updates[col] = valExpr;
            }
          }
        }

        const whereParams = params.slice(paramIdx);
        let changes = 0;

        if (tables[tableName]) {
          for (let i = 0; i < tables[tableName].length; i++) {
            if (this.evaluateWhere(tables[tableName][i], wherePart, whereParams)) {
              tables[tableName][i] = { ...tables[tableName][i], ...updates };
              changes++;
            }
          }
        }

        await this.saveTables(tables);
        return { lastInsertRowId: 1, changes };
      }
    }

    // 3. DELETE
    if (/^DELETE FROM/i.test(cleanSql)) {
      const deleteMatch = cleanSql.match(/^DELETE FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/i);
      if (deleteMatch) {
        const tableName = deleteMatch[1].toLowerCase();
        const wherePart = deleteMatch[2] || '';
        let changes = 0;

        if (tables[tableName]) {
          const initialLen = tables[tableName].length;
          tables[tableName] = tables[tableName].filter(
            (row) => !this.evaluateWhere(row, wherePart, params)
          );
          changes = initialLen - tables[tableName].length;
        }

        await this.saveTables(tables);
        return { lastInsertRowId: 0, changes };
      }
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  private evaluateWhere(row: any, whereClause: string, params: any[]): boolean {
    if (!whereClause || !whereClause.trim()) return true;
    const normalized = whereClause.trim();

    // 1. users: LOWER(username) = ? OR LOWER(email) = ?
    if (/LOWER\(username\)\s*=\s*\?\s*OR\s*LOWER\(email\)\s*=\s*\?/i.test(normalized)) {
      const val0 = String(params[0] ?? '').toLowerCase();
      const val1 = String(params[1] ?? '').toLowerCase();
      const rowUser = String(row.username ?? '').toLowerCase();
      const rowEmail = String(row.email ?? '').toLowerCase();
      return rowUser === val0 || rowEmail === val1;
    }

    // 2. users: username = 'dbueno' OR email = 'dbueno@aio.app'
    if (/username\s*=\s*'dbueno'\s*OR\s*email\s*=\s*'dbueno@aio\.app'/i.test(normalized)) {
      return row.username === 'dbueno' || row.email === 'dbueno@aio.app';
    }

    // 3. users: id = ? OR username = 'dbueno'
    if (/id\s*=\s*\?\s*OR\s*username\s*=\s*'dbueno'/i.test(normalized)) {
      return row.id === params[0] || row.username === 'dbueno';
    }

    // 4. fitness_profile: id = 'default_profile'
    if (/id\s*=\s*'default_profile'/i.test(normalized)) {
      return row.id === 'default_profile';
    }

    // 5. single column = ?
    const singleMatch = normalized.match(/^([a-zA-Z0-9_]+)\s*=\s*\?$/i);
    if (singleMatch) {
      const col = singleMatch[1].toLowerCase();
      const target = params[0];
      return row[col] === target;
    }

    // 6. Compound or literal equality
    const parts = normalized.split(/\s+AND\s+/i);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      const m = part.match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/i);
      if (m) {
        const col = m[1].toLowerCase();
        const rawVal = m[2].trim();
        let expected: any;
        if (rawVal === '?') {
          expected = params[i];
        } else if (rawVal.startsWith("'") && rawVal.endsWith("'")) {
          expected = rawVal.slice(1, -1);
        } else if (!isNaN(Number(rawVal))) {
          expected = Number(rawVal);
        } else {
          expected = rawVal;
        }
        if (row[col] !== expected) return false;
      }
    }

    return true;
  }

  private sortRows(rows: any[], orderByClause: string): any[] {
    if (!orderByClause || !orderByClause.trim()) return rows;
    const parts = orderByClause.split(',').map((p) => p.trim());
    return rows.sort((a, b) => {
      for (const part of parts) {
        const match = part.match(/^([a-zA-Z0-9_]+)(?:\s+(ASC|DESC))?$/i);
        if (match) {
          const col = match[1].toLowerCase();
          const dir = (match[2] || 'ASC').toUpperCase();
          const valA = a[col];
          const valB = b[col];

          if (valA === valB) continue;
          if (valA === undefined || valA === null) return dir === 'ASC' ? 1 : -1;
          if (valB === undefined || valB === null) return dir === 'ASC' ? -1 : 1;

          if (valA < valB) return dir === 'ASC' ? -1 : 1;
          if (valA > valB) return dir === 'ASC' ? 1 : -1;
        }
      }
      return 0;
    });
  }
  public async resetAllData(): Promise<void> {
    const current = await this.getTables();
    const fresh = getInitialData();
    fresh.users = current.users;
    fresh.fitness_profile = current.fitness_profile;
    this.tables = fresh;
    this.loadPromise = null;
    await this.saveTables(fresh);
  }
}

let webDbInstance: WebSQLiteDatabase | null = null;

export async function getWebDatabase(): Promise<any> {
  if (!webDbInstance) {
    webDbInstance = new WebSQLiteDatabase();
  }
  return webDbInstance;
}

export async function resetWebDatabaseData(): Promise<void> {
  const db = await getWebDatabase();
  await db.resetAllData();
}
