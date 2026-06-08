import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './authStore';

const PB = 'https://pb.example.com';

function jsonResp(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function reset() {
  window.localStorage.clear();
  useAuthStore.setState({
    baseUrl: null,
    token: null,
    user: null,
    loading: false,
    error: undefined,
  });
}

describe('authStore', () => {
  beforeEach(reset);
  afterEach(() => vi.restoreAllMocks());

  it('init 无存储 → 字段保持 null', () => {
    useAuthStore.getState().init();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('init 已存储 → 恢复 token/user', () => {
    window.localStorage.setItem(
      'quiet:pb-auth',
      JSON.stringify({
        baseUrl: PB,
        token: 't',
        user: { id: 'u1', email: 'a@b', verified: true },
      }),
    );
    useAuthStore.getState().init();
    const s = useAuthStore.getState();
    expect(s.token).toBe('t');
    expect(s.user?.email).toBe('a@b');
  });

  it('init 损坏 JSON → 保持 null', () => {
    window.localStorage.setItem('quiet:pb-auth', '{not-json');
    useAuthStore.getState().init();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('signIn 成功 → 持久化 + 状态更新', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(
      jsonResp(200, {
        token: 'tok',
        record: { id: 'u1', email: 'a@b', verified: true },
      }),
    );
    await act(async () => {
      await useAuthStore.getState().signIn(PB, 'a@b', 'p');
    });
    const s = useAuthStore.getState();
    expect(s.token).toBe('tok');
    expect(s.user?.id).toBe('u1');
    expect(window.localStorage.getItem('quiet:pb-auth')).toContain('"tok"');
  });

  it('signIn 失败 → error + 抛错', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(
      jsonResp(400, { message: '凭证错误' }),
    );
    await expect(
      useAuthStore.getState().signIn(PB, 'a@b', 'wrong'),
    ).rejects.toThrow();
    expect(useAuthStore.getState().error).toContain('凭证错误');
  });

  it('signUp 成功 → 自动登录', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy
      .mockReturnValueOnce(jsonResp(200, { id: 'u1', email: 'a@b' })) // create user
      .mockReturnValueOnce(
        Promise.resolve(new Response(null, { status: 204 })),
      ) // request verification
      .mockReturnValueOnce(
        jsonResp(200, {
          token: 'tok',
          record: { id: 'u1', email: 'a@b', verified: false },
        }),
      ); // auth-with-password
    await act(async () => {
      await useAuthStore.getState().signUp(PB, 'a@b', 'pwd123', 'pwd123');
    });
    expect(useAuthStore.getState().token).toBe('tok');
    expect(useAuthStore.getState().user?.verified).toBe(false);
  });

  it('signUp 失败抛错', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(
      jsonResp(400, { message: '邮箱重复' }),
    );
    await expect(
      useAuthStore.getState().signUp(PB, 'a@b', 'pwd', 'pwd'),
    ).rejects.toThrow();
    expect(useAuthStore.getState().error).toContain('邮箱重复');
  });

  it('signOut 清空 token + 存储', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(
      jsonResp(200, {
        token: 'tok',
        record: { id: 'u1', email: 'a@b', verified: true },
      }),
    );
    await act(async () => {
      await useAuthStore.getState().signIn(PB, 'a@b', 'p');
    });
    act(() => useAuthStore.getState().signOut());
    expect(useAuthStore.getState().token).toBeNull();
    expect(window.localStorage.getItem('quiet:pb-auth')).toBeNull();
  });
});
