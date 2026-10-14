# Maintained version

Reminder channels follow [dsh-notify-me](https://github.com/chromoany/dsh-notify-me). The implementation subscribes to the host's shared live-status source without history projections, repeated current-session scans or polling. Preferences belong to this browser; cross-tab deduplication is bounded. Its worker handles notification clicks without caching or fetch interception, focusing an existing DSH page and opening the corresponding session.

This fork derives from [Nwflower/dsh-claude-style](https://github.com/Nwflower/dsh-claude-style). `master` retains upstream code; `maintained` owns local features, loading optimizations and the phone UI. The source baseline is `c97673a`, the upstream 0.13.2 source commit. Upstream version tags point to packaged output.

The skin owns the phone layout and native textarea. Disable `dsh-web-mobile` and `dsh-mobile-flow` when enabling this build. Drafts are committed through the official input slot on submit, blur or page departure; typing and composition keep the textarea DOM stable. Native textareas use the platform caret, and the official editor keeps the configured animated caret. The input switch is under Tools.

More and Tools open one floating window at a time. Dismiss outside, with the close button or with Escape. Native model, permission, input, file-panel and view controls remain available without enlarging the header or composer. Windows follow the visual viewport and long control groups scroll internally.

Phone reading keeps only a one-row header and compact input bar. Models, statistics and goal actions move into Tools, whose dot indicates a current goal. Decorative mascots stay off phone conversations to leave room for chat within the browser's visual viewport.

Desktop input cards provide multiline space, a wrapping settings toolbar and separate context statistics. While a task runs with an empty draft, native input hides its own send button to keep the host stop control operable.

Use `origin` for this fork and `upstream` for the original project. Edit source and generate `lib` through the native build. Keep source tags immutable and build each release into a separate directory. The fork workflow validates and packs artifacts; upstream npm publishing is restricted to the original repository, and this package is private. Sessions, notes, credentials, backups and `.debug` never enter version control.

To upgrade, fetch upstream, create an upgrade branch from `maintained`, review incoming commits and merge the source branch. Run lint, build, unit tests, full smoke and the real-host conversation, narrow, contract, send, readerScroll and remoteSettings scenarios. Preserve pagination, age filtering, dashboard visibility, index caching and phone behavior. Update the version, change log and compatibility record before switching the profile to a newly built release entry.

Keep the settings entry ID fixed at `ui-skin-claude-maintained`. Change only its module path to the new immutable release directory and retain its configuration, so version upgrades preserve existing preferences.

The verified host is **0.2.0-rc.2**. **0.2.1 is not installed here and is unverified**. Install a new host separately and test with its own `DSH_HOME`, fixtures and model service before production activation. Audit the contracts under `packages/contracts/src`; changing a version number does not establish compatibility.

Before activation, archive the previous skin and phone plugins, preserving their configuration sections. Selective rollback restores those sections and leaves later unrelated configuration changes, conversations and note data intact. Each server backup includes a README and a rollback script with `--dry-run`.

Native-input design follows the slot and commit-point approach of [imroc/dsh-mobile-flow](https://github.com/imroc/dsh-mobile-flow); attribution and its MIT license remain in the third-party notices. Browser simulation verifies layout and event handling; hardware keyboards on HarmonyOS, Android and iOS still require device testing.
