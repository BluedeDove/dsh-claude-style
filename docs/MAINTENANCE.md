# 自维护版本

提醒功能参考 [dsh-notify-me](https://github.com/chromoany/dsh-notify-me) 的通知渠道，直接订阅宿主共享的运行与待处理状态，不创建历史投影、不逐行查找当前会话、不轮询。配置按浏览器保存，跨标签页的提醒使用有界去重记录。通知 worker 仅处理提醒点击，不缓存资源、不拦截请求；点击后聚焦已有 DSH 页面并打开对应会话。

本仓库从 [Nwflower/dsh-claude-style](https://github.com/Nwflower/dsh-claude-style) 派生。`master` 保留上游代码，`maintained` 保存本地功能、加载优化与手机界面。当前基线是上游 0.13.2 的源码提交 `c97673a`；上游 `v0.13.2` 标签指向发布产物，不能用它代替源码开发分支。

手机界面已经整合到皮肤中，启用时关闭 `dsh-web-mobile` 和 `dsh-mobile-flow` 两个旧插件。原生文本框通过官方输入插槽连接草稿和发送动作；组合输入期间不改写字段，提交、失焦或离开页面时保存草稿。系统光标用于原生文本框，官方输入框仍遵循皮肤的动画光标设置。输入法切换位于「工具」内。

「更多」与「工具」在浮窗内展开，一次只打开一个，点击外侧、关闭按钮或 Escape 收起。原有模型、权限、输入法、文件面板和视图操作保持可用，展开不会增加顶栏或输入栏的高度。浮窗随可视视口调整，较多控件在内部滚动。

手机阅读只保留一行顶栏和紧凑输入栏；模型、统计和目标操作收入「工具」，有目标时按钮显示提示圆点。手机对话页隐藏装饰吉祥物，尽量把浏览器可视区域还给聊天。

桌面输入区提供多行空间，设置栏随可用宽度换行，上下文统计独立显示。原生输入在运行任务且没有草稿时隐藏自己的发送按钮，保持宿主的停止入口可操作。

## 仓库与发布

- `origin` 是自己的 GitHub fork，`upstream` 是原作者仓库。
- 开发只改源码，`lib` 由原生构建生成，不进入源码分支。
- 源码版本标签不可移动。安装包由同一个源码提交生成，通过手动发布的 GitHub Release 保存。
- fork 的构建工作流检查源码并提供安装包；上游 npm 发布工作流仅在原作者仓库运行，本包也标记为 private。
- 会话、便签内容、账号配置、令牌、备份与 `.debug` 均不上传到仓库。

## 手动升级上游皮肤

```sh
git fetch upstream
git switch -c upgrade/upstream-next maintained
git log --oneline maintained..upstream/master
git merge upstream/master
npm ci
npm run lint
npm run build
npm test
npm run smoke
node packages/testing/e2e.cjs --scenario conversation,narrow,contract,send,readerScroll,remoteSettings
```

合并时逐项保留分页、年龄过滤、首页可见性、索引缓存和手机模块。每次更新修改包版本、变更记录和兼容表，构建到新的发布目录，再切换对应的 profile 条目。设置条目的 ID 固定为 `ui-skin-claude-maintained`，升级只改变模块路径并保留配置，避免丢失已有设置。正式服务的客户端模块会缓存代码，切换要使用新的发布路径或宿主提供的模块重建事件；不要覆盖运行中的版本目录。

## 手动升级 DSH

当前验证的宿主是 **0.2.0-rc.2**。**0.2.1 尚未发布在这台服务器上，未验证兼容性**。升级时先把新宿主安装到独立目录，使用独立 `DSH_HOME`、测试会话和模型服务运行回归。检查 `packages/contracts/src` 的 DOM 与服务契约，修复源码后再启用到正式 profile。不能仅修改版本号就宣称兼容。

验收包括手机输入、一次点击只发送一条、中文组合输入、附件、命令、抽屉侧栏、文件面板、键盘高度、浅深色、横竖屏及桌面恢复；同时复查便签和图片插件。

## 安装与撤回

每次启用前单独归档上一版皮肤与两个手机插件，保存配置中的皮肤区块及手机插件状态；回滚脚本只恢复这两部分，保留之后的其他配置修改。不要用整个 profile 的旧副本覆盖现有文件，也不要覆盖任何会话或便签数据。

服务器的每个备份目录均附 `README.md` 和可先运行的 `rollback.py --dry-run`；确认匹配本轮区块后执行 `rollback.py` 即可撤回本轮。

手机原生输入的设计参考了 [imroc/dsh-mobile-flow](https://github.com/imroc/dsh-mobile-flow) 的插槽与提交点处理，相关作者和 MIT 许可保留于第三方说明中。浏览器模拟可以验证布局与事件处理，真实 HarmonyOS / Android / iOS 键盘仍需要真机验收。
