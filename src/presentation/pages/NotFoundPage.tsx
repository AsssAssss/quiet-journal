import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="text-center">
        <div className="font-serif text-3xl mb-3">找不到这一页</div>
        <div className="text-sm text-muted mb-6">页面也许从来就不存在。</div>
        <Link
          to="/timeline"
          className="quiet-btn inline-flex"
          style={{
            background: 'var(--accent)',
            color: 'var(--bg)',
            borderColor: 'transparent',
          }}
        >
          回到时间线
        </Link>
      </div>
    </div>
  );
}
