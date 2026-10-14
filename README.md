> 自维护版本：开发与手动升级使用 `maintained` 分支。内置手机界面替代 `dsh-web-mobile` 与 `dsh-mobile-flow`；启用前关闭两个旧插件。已验证 DSH 0.2.0-rc.2，未来版本需先测试。[维护与撤回说明](docs/MAINTENANCE.md)

<div align="center">

# DSH Claude Style

**为 DeepSeek Harness 复刻 Claude Code Desktop 风格与交互体验的主题插件。**

> **在 DSH 里，就是 Claude Code Desktop 的样子。**

[![简体中文](https://img.shields.io/badge/lang-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-red.svg)](README.md) [![English](https://img.shields.io/badge/lang-English-blue.svg)](README.en.md)

[![version](https://img.shields.io/npm/v/dsh-claude-style?style=flat&label=version&color=D97757)](https://www.npmjs.com/package/dsh-claude-style)
[![downloads](https://img.shields.io/npm/dm/dsh-claude-style?style=flat&label=downloads&color=D97757)](https://www.npmjs.com/package/dsh-claude-style)
[![GitHub stars](https://img.shields.io/github/stars/Nwflower/dsh-claude-style?style=flat&label=%E2%98%85&color=08C)](https://github.com/Nwflower/dsh-claude-style)
[![dsh.so install](https://www.dsh.so/badge/install/dsh-claude-style.svg)](https://www.dsh.so/artifact/dsh-claude-style/)
[![license](https://img.shields.io/badge/license-MIT-2EA44F?style=flat)](LICENSE)

</div>

## 本 fork 改了什么

本仓库 fork 自 [Nwflower/dsh-claude-style](https://github.com/Nwflower/dsh-claude-style)，由 [BluedeDove](https://github.com/BluedeDove) 自己维护、自己使用。上游是这个主题的真源，下面的改动只反映本机使用需要，不代表上游的开发方向，也不代表原作者的认可。

基线是上游 `master` 的源码提交 `c97673a`（0.13.2 的源码）。`master` 分支与上游保持一致，改动全部在 `maintained` 分支上；如何手动跟随上游与回滚，见 [docs/MAINTENANCE.md](docs/MAINTENANCE.md)。

| 改动 | 说明 | 提交 |
| --- | --- | --- |
| 手机界面与加载优化整合 | 把原先由 `dsh-web-mobile` 做的加载优化搬进皮肤，手机界面成为皮肤自己的功能（`packages/client/src/features/mobile/`：手机外壳、原生输入框、样式、功能清单）；宿主一侧改了首页数据、会话搜索与用量折叠，配套新增 `packages/testing/mobile.cjs` 冒烟场景。整合后不再需要 `dsh-web-mobile` 和 `dsh-mobile-flow`，启用本皮肤前先关掉这两个插件。 | `2205ee2` |
| 手机布局精简、控件改浮窗 | 手机端只保留一行顶栏和一条紧凑输入栏，模型、统计与目标操作收进「工具」，有目标时按钮上显示提示圆点；「更多」和「工具」在浮窗里互斥展开，点外侧、关闭按钮或 Escape 收起，展开时不增高顶栏和输入栏；手机对话页隐藏装饰吉祥物，把可视区域尽量留给聊天。桌面输入区给到多行空间，设置栏随可用宽度换行，上下文统计独立显示。 | `daa6289` |
| 维护版构建修复 | 给托管环境里的 Chromium 加上 `--no-sandbox` 启动参数；加上之前，维护版构建连续两次在冒烟阶段失败。 | `dcd5192` |

为了不占上游的名字，包名改成 `dsh-claude-style-maintained` 并标记 `private`，不发布到 npm，安装包只从本仓库的 [Releases](https://github.com/BluedeDove/dsh-claude-style/releases) 取；安装包由 `npm pack` 生成，沿用上游的打包排除规则，实测不含 Anthropic 专有字体，带的是 JetBrains Mono、Inter、Noto Serif 三份 OFL 字体及其许可文本。设置条目 ID 固定为 `ui-skin-claude-maintained`，升级只换模块路径、保留已有配置。新增 `Maintained build` 工作流，每次推送到 `maintained` 都跑 lint、功能与文档检查、变更记录检查、构建、测试和冒烟。

`LICENSE` 与 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 的上游归属原样保留；手机原生输入参考了 [imroc/dsh-mobile-flow](https://github.com/imroc/dsh-mobile-flow) v0.8.0 的插槽与提交点做法，作者与 MIT 许可记在第三方说明里。

### 想把改动送回上游

上游近期并入的 #42、#43、#45、#50 都来自外部贡献者，但 `CONTRIBUTING.md` 要求先在上游开 issue 说明理由，再提 PR，并说明改动要符合 [设计令牌](docs/STYLE.md)。手机界面与加载优化这两块偏本机使用，是否适合作为上游功能需要先和作者确认；上游已经把动效时长、颜色等收进令牌表，并加了「复制代码超出基线就失败」的 lint 规则，从上游同步后需要复查维护版的实现是否还能通过。

## 预览

本插件提供了两种主题。通过插件设置，可以在 Claude 与 DeepSeek 两套配色之间切换，亮暗跟随系统颜色模式。

### Claude

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-home-light.png" alt="Claude 档工作台首页 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-home-dark.png" alt="Claude 档工作台首页 —— 暗色" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-conversation-light.png" alt="Claude 档 Markdown 对话 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-conversation-dark.png" alt="Claude 档 Markdown 对话 —— 暗色" /></td>
  </tr>
</table>

> Claude品牌主题，原汁原味。工作台首页（上），对话界面（下），浅色（左），深色（右）

### DeepSeek

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-home-light.png" alt="DeepSeek 档工作台首页 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-home-dark.png" alt="DeepSeek 档工作台首页 —— 暗色" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-conversation-light.png" alt="DeepSeek 档 Markdown 对话 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-conversation-dark.png" alt="DeepSeek 档 Markdown 对话 —— 暗色" /></td>
  </tr>
</table>

> DeepSeek品牌主题，拥有特色宠物小鲸鱼Deepy。工作台首页（上），对话界面（下），浅色（左），深色（右）
>
> <table>
>   <tr>
>     <td align="center" width="25%"><img src="./docs/gifs/idle.gif" width="120" alt="空闲" /><br />空闲</td>
>     <td align="center" width="25%"><img src="./docs/gifs/thinking.gif" width="120" alt="思考" /><br />思考</td>
>     <td align="center" width="25%"><img src="./docs/gifs/typing.gif" width="120" alt="写回答、调用工具" /><br />写回答、调用工具</td>
>     <td align="center" width="25%"><img src="./docs/gifs/conducting.gif" width="120" alt="指挥子代理" /><br />指挥子代理</td>
>   </tr>
>   <tr>
>     <td align="center" width="25%"><img src="./docs/gifs/notification.gif" width="120" alt="等你操作" /><br />等你操作</td>
>     <td align="center" width="25%"><img src="./docs/gifs/error.gif" width="120" alt="失败" /><br />失败</td>
>     <td align="center" width="25%"><img src="./docs/gifs/happy.gif" width="120" alt="完成" /><br />完成</td>
>     <td align="center" width="25%"><img src="./docs/gifs/sleeping.gif" width="120" alt="睡着" /><br />睡着</td>
>   </tr>
> </table>

## 安装

本 fork 的改动不在 npm 上：下面几步装到的是上游原版，不含上面的手机界面与加载优化。要用自维护版，从 [Releases](https://github.com/BluedeDove/dsh-claude-style/releases) 下载 `dsh-claude-style-maintained-*.tgz`，再执行 `dsh plugin --profile web add <本地 tgz 路径>`（`dsh plugin add` 把参数转给 pnpm，pnpm 接受本地 tarball），安装前关闭 `dsh-web-mobile` 与 `dsh-mobile-flow`；直接 `dsh plugin --profile web add BluedeDove/dsh-claude-style` 拿不到可用产物，`lib/` 不进源码分支。以下适用于上游原版。


1. 官方插件页，添加以下插件即可快速安装

```
dsh-claude-style
```

2. 通过终端安装

```bash
dsh plugin --profile web add dsh-claude-style                  # npm 包（推荐）
```

3. 通过[插件市场](https://github.com/dsh-market/dsh-market)安装
4. 通过dsh-web-all插件的皮肤中心安装

同一时刻建议只启用一个主题。安装后推荐重启 `DeepSeek Harness`以获得完整能力。

## 字体

> **重要：Anthropic 没有对其字体进行公开发行，[`点击此处可以查看`](https://github.com/Nwflower/dsh-claude-style/raw/main/packages/assets/src/fonts)，请自行下载，仅供学习或研究用途**。

Anthropic 字体启用（二选一）：

① 安装到系统——Windows 双击 `.ttf` → 「安装」，macOS 用「字体册」导入；

② 免安装——把 `.ttf` 复制到 `$DSH_HOME/dsh-claude-style/fonts/`。

## 文档

| 文档 | 说明 |
| --- | --- |
| [设计令牌](docs/STYLE.md) | 调色板、字体、形状，源码结构与宿主选择器纪律（英文） |
| [架构决策](docs/decisions/README.md) | 每条决策一个文件：构建与源码、宿主边界、运行时与各个功能的取舍，以及正在进行的架构迁移 |
| [更新日志](CHANGELOG.md) | 版本历史 |
| [贡献指南](CONTRIBUTING.md) | 如何从 `packages/client/src/` 构建、提交规范与截图/回归工具（英文） |
| [功能一览](docs/FEATURES.md) | 每一项功能做什么、在设置页哪里开关 |
| [设置说明](docs/SETTINGS.md) | 五个分页（通用、外观、输入区、侧栏、对话）的设置项与各档效果 |

## 鸣谢

对话导航的展开列表、快捷键跳转与落点横线参考了 SherUnlocked-4869 的 [dsh-plugin-msg-nav](https://github.com/SherUnlocked-4869/dsh-plugin-msg-nav)（MIT）。

像素小鲸鱼 Deepy 的动画帧图来自 calmly-eating-bugs（[@wp3171216237](https://github.com/wp3171216237)）绘制的 Deepy 小鲸鱼主题包。

聊天区域内的增强动效修改自 [dsh-chat-ux](https://github.com/alm-allen/dsh-chat-ux)（MIT）。

像素螃蟹（Clawd）是 Anthropic 的角色形象，相关权利归 Anthropic 所有。螃蟹掏出电脑敲代码的动画取自 Claude Code，其余各个状态的动画由本项目按这一形象绘制。螃蟹的帧图不适用 MIT 许可（见 [LICENSE](LICENSE)）。本插件是非官方的爱好者作品，与 Anthropic 没有关联，也未获其认可。

## 友链

> 想把 Claude Code / Codex 等外部代理的会话历史导入 DSH 接着聊？推荐作者的另一个插件 [dsh-chat-import](https://github.com/Nwflower/dsh-chat-import)。

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Nwflower/dsh-claude-style&type=Date)](https://star-history.com/#Nwflower/dsh-claude-style&Date)
