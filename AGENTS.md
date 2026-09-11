# 你的胆子真的是肥嘟嘟的（waimai-knight）

2D 俯视角 H5 外卖骑手游戏。纯原生 Canvas 2D，无框架、无构建，逻辑分辨率 480×800。

## 目录结构

- `index.html` 入口，按依赖顺序加载 `src/` 下全部脚本（经典 `<script>`，全局共享作用域）
- `src/core/` config(常量) / state(全局状态) / canvas / assets(贴图) / input / audio(音效) / utils
- `src/entities/` player / enemy / police / customer / shop / pickup / boss
- `src/systems/` collision / zone / weapons / gameflow
- `src/fx/` smoke / boom / floattext
- `src/ui/` hud
- `assets/贴图/` 游戏用贴图（已压缩）；`assets/音效/` 音频；`assets/新贴图/` 源图（本地，不上传）
- `tools/` 开发小工具（对齐/载具缩放/音频压缩/音效测试）

## 命令

- 本地运行：`npx serve .`
- 代码检查：`npm run lint`（eslint src）
- 格式化：`npm run format`
- 部署：推送到 `main` 分支，GitHub Pages 自动构建

## 约定

- 跨文件引用全局变量/函数时，在文件顶部用 `/* global xxx */` 注释声明（ESLint 依赖它）
- 贴图尺寸按 `naturalWidth/Height` 动态计算，不写死
- 贴图内容包围盒用 `detectSpriteBox` 剔除透明留白
- 新增载具：在 `config.js` 的 `VEHICLES` 加一项 + `assets.js` 加载贴图即可
- 只有用户明确说「提交git / 上传」时才 commit / push

## 参考文档

- `docs/toy-js-sdk-abilities.md` — B站 Toy JS SDK 能力清单
