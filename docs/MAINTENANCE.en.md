# Maintained version

This fork derives from [Nwflower/dsh-claude-style](https://github.com/Nwflower/dsh-claude-style). `master` retains upstream code; `maintained` owns local features, loading optimizations and the phone UI. The source baseline is `c97673a`, the upstream 0.13.2 source commit. Upstream version tags point to packaged output.

The skin owns the phone layout and native textarea. Disable `dsh-web-mobile` and `dsh-mobile-flow` when enabling this build. Drafts are committed through the official input slot on submit, blur or page departure; typing and composition keep the textarea DOM stable. Native textareas use the platform caret, and the official editor keeps the configured animated caret. The input switch is under Tools.

Use `origin` for this fork and `upstream` for the original project. Edit source and generate `lib` through the native build. Keep source tags immutable and build each release into a separate directory. The fork workflow validates and packs artifacts; upstream npm publishing is restricted to the original repository, and this package is private. Sessions, notes, credentials, backups and `.debug` never enter version control.

To upgrade, fetch upstream, create an upgrade branch from `maintained`, review incoming commits and merge the source branch. Run lint, build, unit tests, full smoke and the real-host conversation, narrow, contract, send, readerScroll and remoteSettings scenarios. Preserve pagination, age filtering, dashboard visibility, index caching and phone behavior. Update the version, change log and compatibility record before switching the profile to a newly built release entry.

The verified host is **0.2.0-rc.2**. **0.2.1 is not installed here and is unverified**. Install a new host separately and test with its own `DSH_HOME`, fixtures and model service before production activation. Audit the contracts under `packages/contracts/src`; changing a version number does not establish compatibility.

Before activation, archive the previous skin and phone plugins, preserving their configuration sections. Selective rollback restores those sections and leaves later unrelated configuration changes, conversations and note data intact. Each server backup includes a README and a rollback script with `--dry-run`.

Native-input design follows the slot and commit-point approach of [imroc/dsh-mobile-flow](https://github.com/imroc/dsh-mobile-flow); attribution and its MIT license remain in the third-party notices. Browser simulation verifies layout and event handling; hardware keyboards on HarmonyOS, Android and iOS still require device testing.
