import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteSyncError } from '@/domain/repositories/IRemoteSyncAdapter';
import { WebdavSyncAdapter, parseMultiStatus } from './webdavSyncAdapter';

const CFG = {
  baseUrl: 'https://dav.example.com/quiet/',
  username: 'u',
  password: 'p',
};

function mockResp(init: { status: number; body?: string }) {
  // 204/304/205 必须无 body
  const noBody =
    init.status === 204 || init.status === 304 || init.status === 205;
  return Promise.resolve(
    new Response(noBody ? null : (init.body ?? ''), { status: init.status }),
  );
}

describe('WebdavSyncAdapter', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });
  afterEach(() => vi.restoreAllMocks());

  it('ping 成功', async () => {
    fetchSpy.mockReturnValueOnce(mockResp({ status: 207 }));
    const a = new WebdavSyncAdapter(CFG);
    await a.ping();
    const call = fetchSpy.mock.calls[0]!;
    expect(call[0]).toBe('https://dav.example.com/quiet/');
    expect((call[1] as RequestInit).method).toBe('PROPFIND');
  });

  it('ping 失败抛 RemoteSyncError', async () => {
    fetchSpy.mockReturnValueOnce(mockResp({ status: 401 }));
    const a = new WebdavSyncAdapter(CFG);
    await expect(a.ping()).rejects.toBeInstanceOf(RemoteSyncError);
  });

  it('附加 Basic 认证头', async () => {
    fetchSpy.mockReturnValueOnce(mockResp({ status: 207 }));
    const a = new WebdavSyncAdapter(CFG);
    await a.ping();
    const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toMatch(/^Basic /);
  });

  it('getFile 200 返回正文', async () => {
    fetchSpy.mockReturnValueOnce(mockResp({ status: 200, body: 'hello' }));
    const a = new WebdavSyncAdapter(CFG);
    const r = await a.getFile('entries/a.json');
    expect(r).toBe('hello');
  });

  it('getFile 404 返回 null', async () => {
    fetchSpy.mockReturnValueOnce(mockResp({ status: 404 }));
    const a = new WebdavSyncAdapter(CFG);
    expect(await a.getFile('entries/x.json')).toBeNull();
  });

  it('getFile 5xx 抛错', async () => {
    fetchSpy.mockReturnValueOnce(mockResp({ status: 500 }));
    const a = new WebdavSyncAdapter(CFG);
    await expect(a.getFile('x')).rejects.toBeInstanceOf(RemoteSyncError);
  });

  it('putFile 先创建目录再 PUT', async () => {
    fetchSpy
      .mockReturnValueOnce(mockResp({ status: 201 })) // MKCOL entries/
      .mockReturnValueOnce(mockResp({ status: 201 })); // PUT
    const a = new WebdavSyncAdapter(CFG);
    await a.putFile('entries/a.json', '{}');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const putCall = fetchSpy.mock.calls[1]!;
    expect((putCall[1] as RequestInit).method).toBe('PUT');
  });

  it('deleteFile 204 / 404 都视为成功', async () => {
    fetchSpy.mockReturnValueOnce(mockResp({ status: 204 }));
    const a = new WebdavSyncAdapter(CFG);
    await a.deleteFile('entries/a.json');
    fetchSpy.mockReturnValueOnce(mockResp({ status: 404 }));
    await a.deleteFile('entries/b.json');
  });

  it('deleteFile 5xx 抛错', async () => {
    fetchSpy.mockReturnValueOnce(mockResp({ status: 500 }));
    const a = new WebdavSyncAdapter(CFG);
    await expect(a.deleteFile('x')).rejects.toBeInstanceOf(RemoteSyncError);
  });

  it('listFiles 解析 207', async () => {
    const xml = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/quiet/entries/</d:href>
    <d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat>
  </d:response>
  <d:response>
    <d:href>/quiet/entries/a.json</d:href>
    <d:propstat>
      <d:prop>
        <d:getlastmodified>Mon, 01 Jun 2026 09:00:00 GMT</d:getlastmodified>
        <d:getcontentlength>42</d:getcontentlength>
        <d:resourcetype/>
      </d:prop>
    </d:propstat>
  </d:response>
</d:multistatus>`;
    fetchSpy.mockReturnValueOnce(mockResp({ status: 207, body: xml }));
    const a = new WebdavSyncAdapter(CFG);
    const files = await a.listFiles('entries/');
    expect(files).toHaveLength(1);
    expect(files[0]!.path).toBe('entries/a.json');
    expect(files[0]!.size).toBe(42);
    expect(files[0]!.modifiedAt).toBeGreaterThan(0);
  });

  it('listFiles 失败抛 RemoteSyncError', async () => {
    fetchSpy.mockReturnValueOnce(mockResp({ status: 500 }));
    const a = new WebdavSyncAdapter(CFG);
    await expect(a.listFiles()).rejects.toBeInstanceOf(RemoteSyncError);
  });

  it('baseUrl 末尾自动补 /', async () => {
    fetchSpy.mockReturnValueOnce(mockResp({ status: 207 }));
    const a = new WebdavSyncAdapter({ ...CFG, baseUrl: 'https://dav.example.com/quiet' });
    await a.ping();
    expect(fetchSpy.mock.calls[0]![0]).toBe('https://dav.example.com/quiet/');
  });
});

describe('parseMultiStatus', () => {
  it('空字符串返回 []', () => {
    expect(parseMultiStatus('', 'https://x/y/', '')).toEqual([]);
  });
});
