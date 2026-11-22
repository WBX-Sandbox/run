# Changelog

## 1.0.0 – 2026-11-22

- First release: runs a command as a WBX Sandbox job, downloads the repository at the workflow's commit (`checkout`), streams the log, downloads result files (SHA-256 verified) and the signed receipt, writes a step summary and outputs, cancels the job when the workflow is cancelled.
