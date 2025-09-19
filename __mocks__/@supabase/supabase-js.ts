const initialUsers = [
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
{
    id: 3,
    username: 'legacy',
    password_hash: '',
    password: 'legacy-secret',
    nombre_completo: 'Legacy',
    activo: true,
  },
];

const users = initialUsers.map(user => ({ ...user }));

class TableQuery {
  table: string;
  field?: string;
  value?: string;
  operator?: 'eq' | 'ilike';

 updateData?: Record<string, any>;
 
 constructor(table: string) {
    this.table = table;
  }

  select() {
    return this;
  }

 update(data: Record<string, any>) {
    this.updateData = data;
    return this;
  } 
 
  eq(field: string, value: any) {
    this.field = field;
    this.value = value;
    this.operator = 'eq';
   
    if (this.updateData && this.table === 'cajeros') {
      const user = users.find(u => u[field] === value);
      if (user) {
        Object.assign(user, this.updateData);
      }
      this.updateData = undefined;
    } 
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

export const __mockUsers = users;
export const __resetMockUsers = () => {
  users.splice(0, users.length, ...initialUsers.map(user => ({ ...user })));
};
