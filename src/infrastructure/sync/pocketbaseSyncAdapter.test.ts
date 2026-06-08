import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteSyncError } from '@/domain/repositories/IRemoteSyncAdapter';
import { PocketBaseSyncAdapter } from './pocketbaseSyncAdapter';

const CFG = {
  baseUrl: 'https://pb.example.com',
  token: 'tok123',
  userId: 'usr1',
};

function jsonResp(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function plainResp(status: number, body: string | null = '') {
  const noBody = status === 204;
  return Promise.resolve(
    new Response(noBody ? null : body, { status }),
  );
}

describe('PocketBaseSyncAdapter', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });
  afterEach(() => vi.restoreAllMocks());

  it('ping 成功', async () => {
    fetchSpy.mockReturnValueOnce(jsonResp(200, { status: 'OK' }));
    const a = new PocketBaseSyncAdapter(CFG);
    await a.ping();
    expect(fetchSpy.mock.calls[0]![0]).toBe('https://pb.example.com/api/health');
  });

  it('ping 失败抛 RemoteSyncError', async () => {
    fetchSpy.mockReturnValueOnce(plainResp(500));
    const a = new PocketBaseSyncAdapter(CFG);
    await expect(a.ping()).rejects.toBeInstanceOf(RemoteSyncError);
  });

  it('baseUrl 尾斜杠被规范化', async () => {
    fetchSpy.mockReturnValueOnce(jsonResp(200, {}));
    const a = new PocketBaseSyncAdapter({ ...CFG, baseUrl: 'https://pb.example.com/' });
    await a.ping();
    expect(fetchSpy.mock.calls[0]![0]).toBe('https://pb.example.com/api/health');
  });

  it('listFiles 翻页拼接结果', async () => {
    fetchSpy
      .mockReturnValueOnce(
        jsonResp(200, {
          page: 1,
          perPage: 2,
          totalPages: 2,
          totalItems: 3,
          items: [
            { id: 'a', entry_updated_at: 1000, updated: '' },
            { id: 'b', entry_updated_at: 2000, updated: '' },
          ],
        }),
      )
      .mockReturnValueOnce(
        jsonResp(200, {
          page: 2,
          perPage: 2,
          totalPages: 2,
          totalItems: 3,
          items: [{ id: 'c', entry_updated_at: 3000, updated: '' }],
        }),
      );
    const a = new PocketBaseSyncAdapter(CFG);
    const files = await a.listFiles();
    expect(files.map((f) => f.path)).toEqual([
      'entries/a.json',
      'entries/b.json',
      'entries/c.json',
    ]);
    expect(files[0]!.modifiedAt).toBe(1000);
  });

  it('listFiles 未登录抛错', async () => {
    const a = new PocketBaseSyncAdapter({ ...CFG, token: '' });
    await expect(a.listFiles()).rejects.toBeInstanceOf(RemoteSyncError);
  });

  it('getFile 200 返回 payload', async () => {
    fetchSpy.mockReturnValueOnce(
      jsonResp(200, {
        id: 'abc',
        user: 'usr1',
        payload: '{"entry":{"id":"abc"},"updatedAt":1}',
        entry_updated_at: 1,
      }),
    );
    const a = new PocketBaseSyncAdapter(CFG);
    const r = await a.getFile('entries/abc.json');
    expect(r).toContain('"id":"abc"');
  });

  it('getFile 非法路径返回 null', async () => {
    const a = new PocketBaseSyncAdapter(CFG);
    expect(await a.getFile('weird/path')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('getFile 404 返回 null', async () => {
    fetchSpy.mockReturnValueOnce(plainResp(404));
    const a = new PocketBaseSyncAdapter(CFG);
    expect(await a.getFile('entries/x.json')).toBeNull();
  });

  it('getFile 5xx 抛错', async () => {
    fetchSpy.mockReturnValueOnce(plainResp(500));
    const a = new PocketBaseSyncAdapter(CFG);
    await expect(a.getFile('entries/x.json')).rejects.toBeInstanceOf(RemoteSyncError);
  });

  it('putFile 已存在 → PATCH 成功', async () => {
    fetchSpy.mockReturnValueOnce(jsonResp(200, { id: 'x' }));
    const a = new PocketBaseSyncAdapter(CFG);
    await a.putFile('entries/x.json', JSON.stringify({ entry: { id: 'x' }, updatedAt: 1234 }));
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toContain('/records/x');
    expect((init as RequestInit).method).toBe('PATCH');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.entry_updated_at).toBe(1234);
    expect(body.user).toBe('usr1');
  });

  it('putFile 不存在 → PATCH 404 → POST 成功', async () => {
    fetchSpy
      .mockReturnValueOnce(plainResp(404))
      .mockReturnValueOnce(jsonResp(200, { id: 'x' }));
    const a = new PocketBaseSyncAdapter(CFG);
    await a.putFile('entries/x.json', JSON.stringify({ entry: { id: 'x' }, updatedAt: 1 }));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect((fetchSpy.mock.calls[1]![1] as RequestInit).method).toBe('POST');
  });

  it('putFile PATCH 其他错误抛 RemoteSyncError', async () => {
    fetchSpy.mockReturnValueOnce(plainResp(500));
    const a = new PocketBaseSyncAdapter(CFG);
    await expect(
      a.putFile('entries/x.json', JSON.stringify({ entry: { id: 'x' }, updatedAt: 1 })),
    ).rejects.toBeInstanceOf(RemoteSyncError);
  });

  it('putFile POST 失败抛 RemoteSyncError', async () => {
    fetchSpy
      .mockReturnValueOnce(plainResp(404))
      .mockReturnValueOnce(plainResp(500));
    const a = new PocketBaseSyncAdapter(CFG);
    await expect(
      a.putFile('entries/x.json', JSON.stringify({ entry: { id: 'x' }, updatedAt: 1 })),
    ).rejects.toBeInstanceOf(RemoteSyncError);
  });

  it('putFile 未登录抛错', async () => {
    const a = new PocketBaseSyncAdapter({ ...CFG, token: '' });
    await expect(a.putFile('entries/x.json', '{}')).rejects.toBeInstanceOf(
      RemoteSyncError,
    );
  });

  it('putFile body 非 JSON 时也不崩，使用当前时间作为 entry_updated_at', async () => {
    fetchSpy.mockReturnValueOnce(jsonResp(200, {}));
    const a = new PocketBaseSyncAdapter(CFG);
    await a.putFile('entries/y.json', 'not-json');
    const body = JSON.parse(
      (fetchSpy.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(typeof body.entry_updated_at).toBe('number');
  });

  it('deleteFile 204 视为成功', async () => {
    fetchSpy.mockReturnValueOnce(plainResp(204));
    const a = new PocketBaseSyncAdapter(CFG);
    await a.deleteFile('entries/x.json');
  });

  it('deleteFile 404 视为成功', async () => {
    fetchSpy.mockReturnValueOnce(plainResp(404));
    const a = new PocketBaseSyncAdapter(CFG);
    await a.deleteFile('entries/x.json');
  });

  it('deleteFile 5xx 抛错', async () => {
    fetchSpy.mockReturnValueOnce(plainResp(500));
    const a = new PocketBaseSyncAdapter(CFG);
    await expect(a.deleteFile('entries/x.json')).rejects.toBeInstanceOf(
      RemoteSyncError,
    );
  });

  it('deleteFile 非法路径直接返回', async () => {
    const a = new PocketBaseSyncAdapter(CFG);
    await a.deleteFile('weird');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('请求附带 Authorization 头', async () => {
    fetchSpy.mockReturnValueOnce(plainResp(404));
    const a = new PocketBaseSyncAdapter(CFG);
    await a.getFile('entries/x.json');
    const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe('tok123');
  });
});
