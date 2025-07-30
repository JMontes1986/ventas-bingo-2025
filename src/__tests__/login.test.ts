/** @jest-environment node */
import { login } from '@/app/actions';

describe('login action', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  });

  it('logs in successfully with correct credentials', async () => {
    const result = await login({ email: 'admin', password: 'secret' });
    expect(result).toEqual({ success: true, user: expect.objectContaining({ username: 'admin' }) });
  });

  it('fails login with wrong password', async () => {
    const result = await login({ email: 'admin', password: 'wrong' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Usuario o contraseña incorrectos.');
  });

  it('normalizes username case', async () => {
    const result = await login({ email: 'ADMIN', password: 'secret' });
    expect(result.success).toBe(true);
    expect(result.user?.username).toBe('admin');
  });
});
