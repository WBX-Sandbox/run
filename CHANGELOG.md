# Changelog

## 1.0.3 – 2026-11-22

- Security: the GitHub token is no longer sent to the job for public repositories (they are downloaded without it). For private repositories the token is still needed for the download; the documentation now says plainly that processes in the sandbox can read it while the job runs (as with `actions/checkout`), and recommends `permissions: contents: read`.
- With `checkout`, your command runs in a new process after the download.

## 1.0.2 – 2026-11-22

- The result directory and the `artifacts-path` output are created at the start, so later steps with `if: always()` (for example `actions/upload-artifact`) work even when the job could not be started; `status` is then `not_started`.
- Clearer error message when the price limit is too low.

## 1.0.1 – 2026-11-22

- Shorter description for the GitHub Marketplace (at most 125 characters). No change in behaviour.

## 1.0.0 – 2026-11-22

- First release: runs a command as a WBX Sandbox job, downloads the repository at the workflow's commit (`checkout`), streams the log, downloads result files (SHA-256 verified) and the signed receipt, writes a step summary and outputs, cancels the job when the workflow is cancelled.
