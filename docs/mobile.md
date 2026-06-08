# 移动端打包（Capacitor）

把现有 React Web App 打包成 iOS / Android 原生 App。Web 端、桌面 PWA、移动端共用一份代码与同步层。

## 准备

- 已运行 `pnpm install`
- macOS + Xcode 15+（iOS 必需）
- Android Studio + JDK 17（Android 必需）

## 一次性初始化

```bash
pnpm build
npx cap add ios
npx cap add android
```

会生成 `ios/` 与 `android/` 目录，应纳入 git。

## 常规开发循环

```bash
pnpm build && npx cap sync     # 把 dist/ 同步到原生项目
npx cap open ios               # 打开 Xcode
npx cap open android           # 打开 Android Studio
```

在 IDE 中点 Run 即可在模拟器/真机调试。Web 端代码改动后只需要重跑 `pnpm build && npx cap sync`。

## 配置

- `capacitor.config.ts`：appId、appName、SplashScreen、StatusBar、Keyboard
- iOS `Info.plist`：相机/相册权限（按需添加）；NSAppTransportSecurity（HTTPS 全部走）
- Android `AndroidManifest.xml`：自动生成；可添加深色模式资源

## 与同步后端的关系

- 移动端推荐使用 **M7 PocketBase** 后端（避免 WebDAV CORS 问题）
- token 通过 `secureStorage` 抽象保存：原生用 `@capacitor/preferences`（底层 Keychain / EncryptedSharedPreferences）
- 离线写入、联网增量同步

## 隐私清单

App Store / Google Play 提交时声明：
- DataCollection: None
- 数据加密：本地 AES-GCM 256；同步走 HTTPS
- 不追踪、不广告

## TestFlight / Play 内测

- iOS：Apple Developer 账号（$99/yr）+ App Store Connect → TestFlight
- Android：Google Play Console（一次性 $25）→ 内部测试轨道
- 任意 Android 设备也可直接 `.apk` 旁加载

## 常见问题

**Q：刘海/底部小白条遮挡内容？**
A：已在 `globalStyles.css` 中使用 `env(safe-area-inset-*)` 自适应；如需调整某页 padding，加 `pt-[env(safe-area-inset-top)]` 即可。

**Q：键盘弹出遮挡编辑器？**
A：`@capacitor/keyboard` 的 `resize: 'native'` 已设；如某页仍受影响，监听 `keyboardWillShow`/`keyboardWillHide` 事件自行处理。

**Q：进后台 30 秒自动锁定，能否关闭？**
A：在 `src/infrastructure/platform/nativeBootstrap.ts` 中调整 `30_000` 或移除该 listener。

**Q：用户清除 App 数据丢失日记？**
A：与浏览器情况一致；建议鼓励用户开启 vault + 同步，作为兜底。
