# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Repository context

- This is a recovered **Codex source snapshot** for research, not the official Anthropic repository.
- The codebase is TypeScript-first and uses **Bun** as the primary runtime/build tool.
- The shipped CLI entrypoint for local development is `src/entrypoints/cli.tsx`, which bootstraps into `src/main.tsx`.
- This snapshot is not a normal clean checkout: some generated/runtime assets expected by the app may be missing.
- README context matters here: this repo is intended for educational study, defensive security research, architecture review, and supply-chain analysis.

## Common commands

### Install / environment

- `bun install`
- Node requirement from `package.json`: `>=18`
- Bun requirement from `package.json`: `>=1.1.0`

### Development

- `bun run dev`
  - Runs the CLI directly from `src/entrypoints/cli.tsx`.
- `bun run ./src/entrypoints/cli.tsx --help`
  - Quick validation of the source entrypoint without building.

### Build

- `bun run build`
  - Builds the Bun-targeted CLI bundle into `dist/` from `src/entrypoints/cli.tsx` via `scripts/build.ts`.
- `bun run build:exe`
  - Builds a Windows executable at `dist/Codex-snapshot.exe`.

### Type checking

- `bun run typecheck`
  - Runs `tsc --noEmit`.

### Running the built snapshot

- `bun run snapshot -- --help`
  - Runs the built CLI through `scripts/run-snapshot.ps1` with repo-local HOME/config paths under `.codex-home/`.
- `bun run snapshot:help`
  - Convenience wrapper for built snapshot help.
- `bun run snapshot:auth`
  - Checks auth status through the snapshot wrapper.
- `bun run snapshot:print`
  - Minimal smoke test for the built CLI.

### Tests

- There is **no test script defined** in `package.json` in this snapshot.
- There is no documented single-test command in the recovered repo metadata.
- For validation, prefer:
  - `bun run typecheck`
  - `bun run build`
  - targeted CLI smoke runs via `bun run ./src/entrypoints/cli.tsx ...`
  - built-snapshot smoke runs via `bun run snapshot -- ...`

## High-level architecture

### Startup flow

- `src/entrypoints/cli.tsx` is the lightweight bootstrap layer.
  - It installs runtime `MACRO` fallbacks for the recovered snapshot.
  - It handles low-cost fast paths like `--version` before loading the full app.
  - It dispatches feature-gated alternative modes such as bridge/remote-control, daemon workers, background session management, templates, environment runners, and other specialized entrypoints.
- `src/main.tsx` is the main CLI application entry.
  - It performs eager startup work very early: MDM reads, keychain prefetch, analytics/bootstrap setup, managed settings, permission-mode initialization, plugin/skill initialization, CLI argument parsing, session restore, and Ink UI launch.
  - It is the main composition root for commands, tools, MCP integration, policy checks, worktree mode, remote/session flows, and interactive vs headless execution.
- `src/entrypoints/init.ts` performs shared initialization.
  - Config enablement, safe managed env application, CA cert/proxy/mTLS setup, API preconnect, telemetry bootstrap, Windows shell setup, cleanup registration, remote-managed settings/policy-limit loading, and scratchpad setup all start here.

### Core execution model

- `src/QueryEngine.ts` is the core conversation runtime.
  - It owns turn-by-turn session state, message history, tool-call loops, permission-denial tracking, usage accounting, transcript persistence, memory prompt loading, and orchestration between model responses and tool execution.
  - It is the best entrypoint for understanding what happens after a user message is submitted.
- `src/query.ts` and `src/query/` implement the lower-level model query pipeline used by the engine.
- `src/context.ts` and `src/context/` assemble repo, user, and system context that feeds prompts.

### Commands, tools, skills, plugins

- `src/commands.ts` is the slash-command registry.
  - It statically imports the baseline command set and conditionally loads many feature-gated/internal commands.
  - It also merges dynamic commands from bundled skills, skill directories, and plugins.
- `src/tools.ts` is the tool registry.
  - It defines the source of truth for available tools and conditionally enables them based on feature flags, runtime environment, permission/worktree/LSP state, and user type.
  - Tool availability is not purely static; verify the relevant gate before assuming a tool exists in a given run.
- `src/skills/bundled/index.ts` registers built-in higher-level workflows such as config updates, remember, simplify, verify, and debug-oriented flows.
- `src/plugins/bundled/index.ts` currently contains plugin-registration scaffolding, but this snapshot does not register built-in plugins yet.

### UI and interaction layers

- The interactive terminal UI is built with **React + Ink**.
- `src/components/` contains reusable UI components.
- `src/screens/` contains full-screen flows and larger UI surfaces.
- `src/dialogLaunchers.tsx`, `src/interactiveHelpers.tsx`, and `src/replLauncher.tsx` are key orchestration points for dialogs, REPL startup, and interactive control flow.

### Configuration, settings, and policy

- Settings/config handling is spread across `src/utils/config.ts`, `src/utils/settings/`, and `src/migrations/`.
- Remote-managed settings and org policy enforcement are first-class concerns.
  - See `src/services/remoteManagedSettings/` and `src/services/policyLimits/`.
- Tool permissions are deeply integrated into runtime setup; the permission initialization in `src/main.tsx` and runtime filtering in `src/tools.ts` matter as much as individual tool implementations.

### Integrations and platform subsystems

- `src/services/` contains most external/system integrations, including:
  - API/bootstrap/auth
  - MCP client/config/resource loading
  - analytics and feature flags
  - LSP management
  - plugin loading
  - context compaction/compression
- `src/bridge/` implements IDE and remote-control bridging.
- `src/daemon/`, `src/remote/`, `src/server/`, `src/environment-runner/`, and `src/self-hosted-runner/` contain alternative runtime modes beyond the normal interactive CLI.

### State and persistence

- `src/state/` contains app-state stores and change propagation.
- `src/tasks/` and related task tools handle structured task tracking inside the app.
- `src/memdir/` handles persistent memory prompt loading.
- Session/history persistence is handled through utilities such as `src/history.ts` and `src/utils/sessionStorage.ts`.

## Important repo-specific observations

- This repo is **feature-flag heavy**. Many commands, tools, and modes are conditionally compiled or conditionally required via `feature('...')` or environment checks. Before assuming functionality is active, verify the relevant gate.
- This is a **Bun-oriented codebase**, not a standard Node CLI. Prefer Bun commands and Bun build assumptions when changing runtime behavior.
- `src/main.tsx`, `src/entrypoints/cli.tsx`, `src/commands.ts`, `src/tools.ts`, and `src/QueryEngine.ts` are the fastest way to understand how a user request becomes a command/tool-enabled Codex session.
- The Windows snapshot wrapper in `scripts/run-snapshot.ps1` sets repo-local HOME/config paths under `.codex-home/` and forces the built CLI to run with those isolated settings.
- Treat this repository as a **research snapshot**: missing vendor/runtime artifacts can explain failures that would not happen in the original internal repository.
- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` guidance files were present in this snapshot when this file was updated.
- Do not describe this repo as an official Anthropic codebase.
