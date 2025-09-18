import { jest } from '@jest/globals';

type MockQueryResult<T> = { data: T | null; error: { message: string } | null };

type MockUser = {
  id: number;
  username: string;
  password_hash: string;
  nombre_completo: string;
  activo: boolean;
};

const mockUsers: MockUser[] = [
  {
    id: 1,
    username: 'admin',
    password_hash:
      '$2a$10$.WoUnyFlxYvIAvTpBuP1GOuOoZxlo4CSYuR3ohR.oHRhSq7Eo1eqK',
    nombre_completo: 'Admin User',
    activo: true,
  },
];

class MockTableQuery<T> {
  private field?: string;
  private value?: any;
  private operator?: 'eq' | 'ilike';

  constructor(private readonly table: string) {}

  select(): this {
    return this;
  }

  order(): this {
    return this;
  }

  eq(field: string, value: any): this {
    this.field = field;
    this.value = value;
    this.operator = 'eq';
    return this;
  }

  ilike(field: string, value: any): this {
    this.field = field;
    this.value = value;
    this.operator = 'ilike';
    return this;
  }

  async single(): Promise<MockQueryResult<MockUser>> {
    if (this.table === 'cajeros' && this.field === 'username') {
      const lookup = String(this.value ?? '');
      const normalized = this.operator === 'ilike'
        ? lookup.replace(/%/g, '').toLowerCase()
        : lookup;
      const user = mockUsers.find((candidate) => {
        if (this.operator === 'ilike') {
          return candidate.username.toLowerCase() === normalized;
        }
        return candidate.username === normalized;
      });
      return user ? { data: user, error: null } : { data: null, error: { message: 'not found' } };
    }

    return { data: null, error: { message: 'not found' } };
  }

  async limit(): Promise<MockQueryResult<Array<{ id: number }>>> {
    if (this.table === 'productos') {
      return { data: [{ id: 1 }], error: null };
    }

    return { data: null, error: { message: 'not found' } };
  }

  async insert(): Promise<{ error: null }> {
    return { error: null };
  }
}

class MockSupabaseClient {
  from<T>(table: string): MockTableQuery<T> {
    return new MockTableQuery<T>(table);
  }
}

const mockAiGenerate = jest.fn().mockResolvedValue({ text: 'OK' });
const createClientMock = jest.fn(() => new MockSupabaseClient());

jest.mock('@/ai/genkit', () => ({
  __esModule: true,
  ai: {
    generate: mockAiGenerate,
  },
}));

jest.mock('@supabase/supabase-js', () => ({
  __esModule: true,
  createClient: createClientMock,
  SupabaseClient: MockSupabaseClient,
}));

describe('Supabase admin client environment fallbacks', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const setBaseEnvironment = () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.GOOGLE_API_KEY = 'fake-google-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_ROLE_KEY;
  };

  it('allows login when only SUPABASE_SERVICE_KEY is defined', async () => {
    setBaseEnvironment();
    process.env.SUPABASE_SERVICE_KEY = 'service-key';

    await jest.isolateModulesAsync(async () => {
      const { login } = await import('@/app/actions');
      const response = await login({ email: 'admin', password: 'password' });
      expect(response.success).toBe(true);
    });

    expect(createClientMock.mock.calls.some(([, key]) => key === 'service-key')).toBe(true);
  });

  it('reports healthy diagnostics when SUPABASE_SERVICE_KEY is available', async () => {
    setBaseEnvironment();
    process.env.SUPABASE_SERVICE_KEY = 'service-key';

    await jest.isolateModulesAsync(async () => {
      const { runDiagnostics } = await import('@/app/actions');
      const diagnostics = await runDiagnostics();

      expect(diagnostics.envVars.success).toBe(true);
      expect(diagnostics.envVars.message).toContain('Service Key: OK');
      expect(diagnostics.supabaseConnection.success).toBe(true);
      expect(diagnostics.supabaseQuery.success).toBe(true);
      expect(diagnostics.genkitTest.success).toBe(true);
    });

    expect(createClientMock.mock.calls.some(([, key]) => key === 'service-key')).toBe(true);
    expect(mockAiGenerate).toHaveBeenCalled();
  });
});
