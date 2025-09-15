const users = [
 {
    id: 1,
    username: 'admin',
    password_hash:
      '$2a$10$.WoUnyFlxYvIAvTpBuP1GOuOoZxlo4CSYuR3ohR.oHRhSq7Eo1eqK',
    nombre_completo: 'Admin',
    activo: true,
  },
  {
    id: 2,
    username: 'inactive',
    password_hash:
      '$2a$10$.WoUnyFlxYvIAvTpBuP1GOuOoZxlo4CSYuR3ohR.oHRhSq7Eo1eqK',
    nombre_completo: 'Inactive',
    activo: false,
  },
];

class TableQuery {
  table: string;
  field?: string;
  value?: string;
  operator?: 'eq' | 'ilike';

  constructor(table: string) {
    this.table = table;
  }

  select() {
    return this;
  }

  eq(field: string, value: any) {
    this.field = field;
    this.value = value;
    this.operator = 'eq';
    return this;
  }

  ilike(field: string, value: any) {
    this.field = field;
    this.value = value;
    this.operator = 'ilike';
    return this;
  }

  async single() {
    if (this.table === 'cajeros' && this.field === 'username') {
      const val = String(this.value);
      const user = users.find(u => {
        if (this.operator === 'ilike') {
          const pattern = val.replace(/%/g, '.*');
          const regex = new RegExp(`^${pattern}$`, 'i');
          return regex.test(u.username);
        }
        return u.username === val;
      });
      return user
        ? { data: user, error: null }
        : { data: null, error: { message: 'not found' } };
    }
    return { data: null, error: { message: 'not found' } };
  }
  
  async insert(record: any) {
    return { error: null };
  }
}

export class SupabaseClient {
  from(table: string) { return new TableQuery(table); }
}

export const createClient = jest.fn(() => new SupabaseClient());
