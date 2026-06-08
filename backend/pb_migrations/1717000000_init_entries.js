/// <reference path="../pb_data/types.d.ts" />

/**
 * 初始化迁移：
 * - 开启 PB 内置 users collection 的邮箱验证
 * - 创建 entries collection（每条客户端日记一条记录，整个 payload 单字段存储）
 */
migrate(
  (app) => {
    // ---- entries collection ----
    const usersCollection = app.findCollectionByNameOrId('users');

    const entries = new Collection({
      type: 'base',
      name: 'entries',
      // 字段
      fields: [
        // PB 自动加 id；我们用一个独立 id 字段当主键允许客户端指定
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'payload',
          type: 'text',
          required: true,
          max: 1_048_576, // 1 MiB 上限（实际加密 entry 远小于此）
        },
        {
          name: 'entry_updated_at',
          type: 'number',
          required: true,
          min: 0,
        },
      ],
      indexes: [
        'CREATE INDEX idx_entries_user ON entries (user)',
        'CREATE INDEX idx_entries_entry_updated_at ON entries (entry_updated_at)',
      ],
      // 访问规则：只允许本人 CRUD 自己的记录
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule:
        "@request.auth.id != '' && @request.body.user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
    });
    app.save(entries);
  },
  (app) => {
    // 回滚
    const c = app.findCollectionByNameOrId('entries');
    app.delete(c);
  },
);
