const users = [
  { id: 1, username: 'admin', password_hash: '$2a$10$KGoG08CV6FZySPbz2R5Xd.l2U0AmfYKH57yK.5x.iCMq6J1iNIzxe', nombre_completo: 'Admin', activo: true }
];

class TableQuery {
  table: string;
  field?: string;
  value?: string;
  constructor(table: string) { this.table = table; }
  select() { return this; }
  eq(field: string, value: any) { this.field = field; this.value = value; return this; }
  async single() {
    if (this.table === 'cajeros' && this.field === 'username') {
      const user = users.find(u => u.username.toLowerCase() === String(this.value).toLowerCase());
      return user ? { data: user, error: null } : { data: null, error: { message: 'not found' } };
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
