> Maintained fork: use the `maintained` branch for development and manual upgrades. Built-in phone UI replaces `dsh-web-mobile` and `dsh-mobile-flow`; disable both old plugins before activation. Verified with DSH 0.2.0-rc.2; test future versions first. [Maintenance and rollback](docs/MAINTENANCE.en.md)

<div align="center">

# DSH Claude Style

**A theme plugin that brings the look and feel of Claude Code Desktop to the DeepSeek Harness Web GUI.**

> **Claude Code Desktop, right inside DSH.**

[![English](https://img.shields.io/badge/lang-English-blue.svg)](README.en.md) [![简体中文](https://img.shields.io/badge/lang-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-red.svg)](README.md)

[![version](https://img.shields.io/npm/v/dsh-claude-style?style=flat&label=version&color=D97757)](https://www.npmjs.com/package/dsh-claude-style)
[![downloads](https://img.shields.io/npm/dm/dsh-claude-style?style=flat&label=downloads&color=D97757)](https://www.npmjs.com/package/dsh-claude-style)
[![GitHub stars](https://img.shields.io/github/stars/Nwflower/dsh-claude-style?style=flat&label=%E2%98%85&color=08C)](https://github.com/Nwflower/dsh-claude-style)
[![dsh.so install](https://www.dsh.so/badge/install/dsh-claude-style.svg)](https://www.dsh.so/artifact/dsh-claude-style/)
[![license](https://img.shields.io/badge/license-MIT-2EA44F?style=flat)](LICENSE)

</div>

## What this fork changes

This repository is a fork of [Nwflower/dsh-claude-style](https://github.com/Nwflower/dsh-claude-style), maintained by [BluedeDove](https://github.com/BluedeDove) for personal use. Upstream is the source of truth for this theme: the changes below reflect what this machine needs, not upstream's roadmap, and they do not carry the original author's endorsement.

The baseline is upstream source commit `c97673a` on `master` (the 0.13.2 sources). The `master` branch tracks upstream and every change lives on `maintained`; [docs/MAINTENANCE.en.md](docs/MAINTENANCE.en.md) covers manual upgrades and rollback.

| Change | Details | Commit |
| --- | --- | --- |
| Phone UI and loading optimizations merged in | The loading optimizations that used to come from `dsh-web-mobile` now live in the skin, and the phone UI is a feature of the skin itself (`packages/client/src/features/mobile/`: shell, native composer, styles, manifest). The host half was adjusted for home data, session search and usage folding, and `packages/testing/mobile.cjs` adds a smoke scenario. `dsh-web-mobile` and `dsh-mobile-flow` are no longer needed: disable both before enabling this skin. | `2205ee2` |
| Leaner phone layout, controls in floating panels | The phone keeps one header row and a compact composer; model, stats and target controls move into Tools, with a hint dot when a target is set. More and Tools open in mutually exclusive floating panels that close on an outside click, the close button or Escape, and they never grow the header or the composer. The decorative mascot is hidden on the phone conversation page. The desktop composer gets multi-line space, its settings row wraps with the available width, and context stats stand alone. | `daa6289` |
| Maintained build fix | The managed Chromium now gets `--no-sandbox`; before this, the maintained build failed at the smoke stage twice in a row. | `dcd5192` |

The package is renamed `dsh-claude-style-maintained` and marked `private`, so it never claims upstream's name on npm: install packages come from this repository's [Releases](https://github.com/BluedeDove/dsh-claude-style/releases) only. The tarball is produced by `npm pack`, so upstream's packaging exclusions apply — verified: it carries no Anthropic proprietary fonts, and ships the JetBrains Mono, Inter and Noto Serif OFL fonts together with their license texts. The settings entry id is pinned to `ui-skin-claude-maintained`, so upgrades replace the module path and keep the saved configuration. A new `Maintained build` workflow runs lint, the feature, docs and changelog checks, build, tests and smoke on every push to `maintained`.

`LICENSE` and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) keep upstream's attributions unchanged. The native phone composer follows the slot and commit-point design of [imroc/dsh-mobile-flow](https://github.com/imroc/dsh-mobile-flow) v0.8.0, credited with its MIT license in the third-party notices.

### Bringing changes back upstream

Upstream has recently merged external contributions (#42, #43, #45, #50), but `CONTRIBUTING.md` asks for an issue with the rationale before a pull request, and for changes to fit the [design tokens](docs/STYLE.md). The phone UI and the loading optimizations are shaped around this machine, so whether they belong in upstream is worth asking the author first. Upstream has since moved motion timings and colors into its token table and added a lint rule that fails when copied code exceeds the baseline, so review the maintained implementation after each sync.

## Preview

The settings page's Theme style row switches between the Claude and DeepSeek palettes, and light/dark follows your system's color mode. In each group the top row is the Studio home page and the bottom row a Markdown conversation, light on the left and dark on the right.

### Claude

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-home-light.png" alt="Claude brand, Studio home — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-home-dark.png" alt="Claude brand, Studio home — dark" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-conversation-light.png" alt="Claude brand, Markdown conversation — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-conversation-dark.png" alt="Claude brand, Markdown conversation — dark" /></td>
  </tr>
</table>

> Light mode pairs an ivory canvas `#FCFCFB` with a pale sidebar `#FBFBF9`; dark mode uses warm black `#141413`. Ember orange `#D97757` is the single action accent across both canvases, and Claude Code's pixel crab stands on the composer on the home page and in conversations alike.

### DeepSeek

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-home-light.png" alt="DeepSeek brand, Studio home — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-home-dark.png" alt="DeepSeek brand, Studio home — dark" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-conversation-light.png" alt="DeepSeek brand, Markdown conversation — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-conversation-dark.png" alt="DeepSeek brand, Markdown conversation — dark" /></td>
  </tr>
</table>

> Light mode is a white with a touch of sky blue, `#F7FAFF`, with the sidebar at `#F3F7FE`; dark mode is a blue-black `#13161D`. The accent is DeepSeek's brand blue `#4D6BFE`, and Deepy the pixel whale stands on the composer on the home page and in conversations alike.
>
> <table>
>   <tr>
>     <td align="center" width="25%"><img src="./docs/gifs/idle.gif" width="120" alt="Idle" /><br />Idle</td>
>     <td align="center" width="25%"><img src="./docs/gifs/thinking.gif" width="120" alt="Thinking" /><br />Thinking</td>
>     <td align="center" width="25%"><img src="./docs/gifs/typing.gif" width="120" alt="Answering and calling tools" /><br />Answering and calling tools</td>
>     <td align="center" width="25%"><img src="./docs/gifs/conducting.gif" width="120" alt="Conducting subagents" /><br />Conducting subagents</td>
>   </tr>
>   <tr>
>     <td align="center" width="25%"><img src="./docs/gifs/notification.gif" width="120" alt="Waiting on you" /><br />Waiting on you</td>
>     <td align="center" width="25%"><img src="./docs/gifs/error.gif" width="120" alt="Failed" /><br />Failed</td>
>     <td align="center" width="25%"><img src="./docs/gifs/happy.gif" width="120" alt="Finished" /><br />Finished</td>
>     <td align="center" width="25%"><img src="./docs/gifs/sleeping.gif" width="120" alt="Asleep" /><br />Asleep</td>
>   </tr>
> </table>

> The workspaces, sessions, usage figures and nickname in the screenshots are sample data.

## Features and settings

What the plugin does and what each setting changes is documented: [Features](docs/FEATURES.en.md), [Settings](docs/SETTINGS.en.md).

## Fonts

> **Important: the Anthropic fonts do not ship with the npm package; they are in this repository for download and study only.**

| Font | Used for | File |
|---|---|---|
| Anthropic Sans Web Text | Interface / UI | [`packages/assets/src/fonts/anthropic/AnthropicSansWebText.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/packages/assets/src/fonts/anthropic/AnthropicSansWebText.ttf) |
| Anthropic Serif Web Text | Conversation body / Markdown | [`packages/assets/src/fonts/anthropic/AnthropicSerifWebText.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/packages/assets/src/fonts/anthropic/AnthropicSerifWebText.ttf) |

To enable the Anthropic fonts, choose one of the following:

① Install them on your system — on Windows, double-click each `.ttf` and choose "Install"; on macOS, import them with Font Book.

② Skip the install — copy the `.ttf` files into `$DSH_HOME/dsh-claude-style/fonts/`.

## Installation

The changes in this fork are not on npm: the steps below install the upstream original, without the phone UI and loading optimizations above. For the maintained build, download `dsh-claude-style-maintained-*.tgz` from [Releases](https://github.com/BluedeDove/dsh-claude-style/releases) and run `dsh plugin --profile web add <local tarball path>` (`dsh plugin add` forwards its arguments to pnpm, which accepts a local tarball), disabling `dsh-web-mobile` and `dsh-mobile-flow` first. `dsh plugin --profile web add BluedeDove/dsh-claude-style` does not yield a usable build, because `lib/` is not committed. The steps below apply to the upstream original.


1. From the official plugin page, add the plugin below and it installs.

```
dsh-claude-style
```

2. From a terminal:

```bash
dsh plugin --profile web add dsh-claude-style                  # npm package (recommended)
dsh plugin --profile web add Nwflower/dsh-claude-style         # GitHub source
```

3. From the [plugin market](https://github.com/dsh-market/dsh-market)
4. From the Skin Center of the dsh-web-all plugin

Keep only one theme enabled at a time. dsh ≥ 0.1.7 is required, and a restart of DeepSeek Harness brings the full feature set.

## Documentation

| Document | Contents |
| --- | --- |
| [Design tokens](docs/STYLE.md) | Palette, typography, shapes, source layout, and host-selector discipline (in English) |
| [Architecture decisions](docs/decisions/README.md) | One file per decision: build and source, the host boundary, the runtime and each feature's trade-offs, and the architecture migration in progress (in Chinese) |
| [Changelog](CHANGELOG.md) | Version history |
| [Contributing](CONTRIBUTING.md) | Building from `packages/client/src/`, commit conventions, and the screenshot and regression tooling (in English) |

## Acknowledgements

The conversation navigator's opening list, keyboard jumps and landing line follow SherUnlocked-4869's [dsh-plugin-msg-nav](https://github.com/SherUnlocked-4869/dsh-plugin-msg-nav) (MIT).

The animation frames of Deepy the pixel whale come from the Deepy whale theme pack drawn by calmly-eating-bugs ([@wp3171216237](https://github.com/wp3171216237)), and ship with the plugin by the author's permission. Many thanks to the author! GIFs of all 20 animations, contributed by the author, are in [docs/gifs/](docs/gifs/).

The enhanced animations in the chat area are modified from [dsh-chat-ux](https://github.com/alm-allen/dsh-chat-ux) (MIT).

The pixel crab (Clawd) is a character of Anthropic, and all rights in it remain with Anthropic. Its laptop animation is taken from Claude Code; the animations of its other states are drawn by this project after that character. The crab's frames are not covered by the MIT license (see [LICENSE](LICENSE)). This plugin is an unofficial fan work, not affiliated with or endorsed by Anthropic.

## Related projects

> Running several themes at once? Try [dsh-skin-manager](https://github.com/xiaoyangcheng84-svg/dsh-skin-manager) — it switches between all installed themes from a single settings page.

> Want to import your Claude Code / Codex session history into DSH and keep the conversation going? Try the author's other plugin, [dsh-chat-import](https://github.com/Nwflower/dsh-chat-import).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Nwflower/dsh-claude-style&type=Date)](https://star-history.com/#Nwflower/dsh-claude-style&Date)
