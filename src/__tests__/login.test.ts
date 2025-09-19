/** @jest-environment node */
import { __mockUsers, __resetMockUsers } from '@supabase/supabase-js';
import { login } from '@/app/actions';

describe('login action', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  __resetMockUsers();
  });

  it('logs in successfully with correct credentials', async () => {
    const result = await login({ email: 'ADMIN', password: 'secret' });
    expect(result).toEqual({
      success: true,
      user: expect.objectContaining({ username: 'admin' }),
    });
    
    expect(result.user).not.toHaveProperty('password_hash');
    expect(result.user).not.toHaveProperty('password');
  });

  it('fails login with wrong password', async () => {
    const result = await login({ email: 'admin', password: 'wrong' });
    expect(result).toEqual({ success: false, error: 'CONTRASENA_INCORRECTA' });
  });

  it('fails login when user not found', async () => {
    const result = await login({ email: 'unknown', password: 'secret' });
    expect(result).toEqual({ success: false, error: 'USUARIO_NO_ENCONTRADO' });
  });

  it('fails login when user is inactive', async () => {
    const result = await login({ email: 'inactive', password: 'secret' });
    expect(result).toEqual({ success: false, error: 'USUARIO_INACTIVO' });
  });

  it('migrates legacy password when password_hash is missing', async () => {
    const result = await login({ email: 'legacy', password: 'legacy-secret' });

    expect(result.success).toBe(true);

    const legacyUser = __mockUsers.find(user => user.username === 'legacy');
    expect(legacyUser?.password_hash).toEqual(expect.stringMatching(/^\$2[aby]\$.+/));
    expect(legacyUser?.password).toBeNull();
  });
});
