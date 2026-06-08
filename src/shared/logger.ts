/**
 * 结构化日志：所有核心业务与外部调用必须打点，输出 JSON 行便于 AI 分析。
 * 通过 localStorage.quiet:debug = '1' 或环境变量 VITE_DEBUG_LOG = '1' 开启。
 */
export interface LogPayload {
  feature: string;
  action: string;
  requestId?: string;
  user?: string;
  req?: unknown;
  resp?: unknown;
  error?: unknown;
  [k: string]: unknown;
}

function debugEnabled(): boolean {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEBUG_LOG === '1') {
    return true;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('quiet:debug') === '1';
  }
  return false;
}

function emit(level: 'debug' | 'info' | 'warn' | 'error', payload: LogPayload): void {
  if (level === 'debug' && !debugEnabled()) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    ...payload,
    error:
      payload.error instanceof Error
        ? { name: payload.error.name, message: payload.error.message, stack: payload.error.stack }
        : payload.error,
  };
  const fn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : level === 'info'
          ? console.info
          : console.debug;
  fn(JSON.stringify(line));
}

export const logger = {
  debug: (p: LogPayload) => emit('debug', p),
  info: (p: LogPayload) => emit('info', p),
  warn: (p: LogPayload) => emit('warn', p),
  error: (p: LogPayload) => emit('error', p),
};

export function newRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
