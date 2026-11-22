# WBX Sandbox Run

Run a command from your GitHub workflow in an isolated **WBX Sandbox** microVM (Firecracker) on servers in Europe – with a **price limit checked before it starts**, the live log in your workflow, result files downloaded back, and a **signed execution receipt**.

```yaml
- uses: WBX-Sandbox/run@v1
  with:
    api-key: ${{ secrets.WBXSANDBOX_API_KEY }}
    template: node
    command: npm ci && npm test
    max-cost: "0.20"   # in your billing currency – for CZK use "1.50"
```

The action downloads your repository at the workflow's commit into the sandbox, runs the command there and streams the log into the step. The step fails when the command fails.

## Why

- **A bigger or different machine** for heavy tests and builds – pick a template and a compute class.
- **Untrusted code** (pull requests, generated code, dependencies) runs in its own microVM, optionally with **no network** or only an **allowlist**.
- **A hard price limit** – a job that could cost more than `max-cost` is refused before it starts.
- **Proof of what ran** – a signed receipt with the command, template, runtime, exit code and checksums of the result files.

## Getting started

1. Create a free account at [sandbox.wbx.cz](https://sandbox.wbx.cz) and an API key (*API keys* in the portal).
2. Add the key to your repository: *Settings → Secrets and variables → Actions → New repository secret*, name `WBXSANDBOX_API_KEY`.
3. Add the step above to a workflow.

## Examples

**Tests with a report and an allowlist-only network**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: WBX-Sandbox/run@v1
        id: wbx
        with:
          api-key: ${{ secrets.WBXSANDBOX_API_KEY }}
          template: base
          command: pip install -r requirements.txt && pytest --junitxml=report.xml
          network: allowlist
          allow: pypi.org, files.pythonhosted.org
          artifacts: report.xml
          max-cost: "0.20"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: wbx-results
          path: ${{ steps.wbx.outputs.artifacts-path }}
```

**A build in a subdirectory on a faster class, with secrets**

```yaml
- uses: WBX-Sandbox/run@v1
  with:
    api-key: ${{ secrets.WBXSANDBOX_API_KEY }}
    template: rust
    compute-class: performance
    working-directory: engine
    command: cargo build --release && cargo test --release
    artifacts: target/release/engine
    env: |
      DATABASE_URL=${{ secrets.TEST_DATABASE_URL }}
    timeout: "3600"
```

**Without checkout** (the command brings everything it needs)

```yaml
- uses: WBX-Sandbox/run@v1
  with:
    api-key: ${{ secrets.WBXSANDBOX_API_KEY }}
    checkout: false
    network: none
    command: python3 -c "print(sum(range(10**7)))"
```

## Inputs

| Input | Default | Description |
|---|---|---|
| `api-key` | – (required) | WBX Sandbox API key (use a secret). |
| `command` | – (required) | Shell command (`/bin/sh -c`), multi-line is fine. |
| `template` | `base` | `base`, `mini`, `code-interpreter`, `browser`, `node`, `fullstack`, `go`, `rust`, `ubuntu`, … |
| `timeout` | `1800` | Time limit in seconds (up to 86400). |
| `max-cost` | – | Price limit in your billing currency, e.g. `"0.20"`. It must cover the worst case: timeout + about 7 minutes for start and result upload. |
| `compute-class` | account default | `economy`, `balanced`, `performance`, `memory`. |
| `checkout` | `true` | Download this repository at the workflow's commit and run in it. |
| `github-token` | `github.token` | Used only to download a **private** repository (public ones are downloaded without it). Never stored by WBX Sandbox, but processes in the sandbox can read it while the job runs – the same as `actions/checkout`, which keeps it in `.git/config`. Give the workflow `permissions: contents: read`. |
| `working-directory` | `.` | Directory inside the repository. |
| `env` | – | `NAME=value` per line. Values are masked in the log and never stored with the job. |
| `network` | `full` | `full`, `allowlist` or `none`. With `checkout`, GitHub's download hosts are added to the allowlist automatically; `none` needs `checkout: false`. |
| `allow` | – | Allowed domains/addresses for `allowlist` (comma or new line separated). |
| `artifacts` | – | Result files to keep and download, glob patterns relative to the working directory (`dist/**`, `report.xml`). |
| `artifacts-path` | `wbx-artifacts` | Local directory for result files and the receipt. |
| `receipt` | `true` | Save the signed receipt as `receipt.json`. |
| `fail-on-error` | `true` | Fail the step when the job does not complete with exit code 0. |
| `api-url` | `https://sandbox.wbx.cz` | API address. |

## Outputs

`job-id`, `status`, `exit-code`, `cost`, `currency`, `artifacts-path`, `receipt-path`, `job-url`.

`artifacts-path` is set and the directory exists even when the job could not be started (for example a price limit below the worst case) – `status` is then `not_started` – so later steps with `if: always()` keep working.

The step summary shows the status, run time, cost, the number of result files and a short log summary (test results and errors).

## Notes

- A repeated request (for example after a network error) never starts the job twice; re-running the workflow starts a new job.
- Workflows triggered by pull requests from forks do not get repository secrets, so the API key is missing there – use `pull_request_target` only if you understand its risks, or run the action on pushes and internal pull requests.
- Cancelling the workflow cancels the job.
- Result files are verified with SHA-256 when downloaded. The receipt can be verified with the public keys at `https://sandbox.wbx.cz/v1/receipt-keys`.
- Files the command writes to `/tmp` live in memory; keep results inside the working directory.

Documentation: [sandbox.wbx.cz/docs/guides/ci-tests](https://sandbox.wbx.cz/docs/guides/ci-tests) · License: MIT
