# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository context

- This is a recovered **Claude Code source snapshot** for research, not the official Anthropic repository.
- The codebase is TypeScript-first and uses **Bun** as the primary runtime/build tool.
- The shipped CLI entrypoint for local development is `src/entrypoints/cli.tsx`, which bootstraps into `src/main.tsx`.
- This snapshot is not a normal clean checkout: some generated/runtime assets expected by the app may be missing.

## Common commands

### Install / environment

- `bun install`
- Node requirement from `package.json`: `>=18`
- Bun requirement from `package.json`: `>=1.1.0`

### Development

- `bun run dev`
  - Runs the CLI directly from `src/entrypoints/cli.tsx`.
- `bun run ./src/entrypoints/cli.tsx --help`
  - Useful for quick CLI validation without building.

### Build

- `bun run build`
  - Builds the Bun-targeted CLI bundle into `dist/` using `scripts/build.ts`.
- `bun run build:exe`
  - Builds a Windows executable at `dist/claude-snapshot.exe`.

### Type checking

- `bun run typecheck`
  - Runs `tsc --noEmit`.

### Running the built snapshot

- `bun run snapshot -- --help`
  - Runs the built CLI through `scripts/run-snapshot.ps1`.
- `bun run snapshot:auth`
  - Checks auth status through the snapshot wrapper.
- `bun run snapshot:print`
  - Minimal smoke test for the built CLI.

### Tests

- There is **no test script defined** in `package.json` in this snapshot.
- There is also no documented single-test command in the repository metadata that was recovered here.
- If you need validation, prefer:
  - `bun run typecheck`
  - `bun run build`
  - targeted CLI smoke runs via `bun run ./src/entrypoints/cli.tsx ...` or `bun run snapshot -- ...`

## High-level architecture

### Startup flow

- `src/entrypoints/cli.tsx` is a lightweight bootstrap layer.
  - It handles a set of fast paths before loading the full app.
  - It installs runtime `MACRO` fallbacks for the recovered snapshot.
  - It dispatches feature-gated modes like daemon, bridge/remote-control, background session management, and other specialized entrypoints.
- `src/main.tsx` is the main CLI application entry.
  - It performs eager startup work like MDM/settings reads and keychain prefetch.
  - It wires Commander-style CLI parsing, config loading, analytics/feature-flag initialization, policy checks, session restore, rendering, and command/tool registration.
- `src/entrypoints/init.ts` performs shared initialization.
  - Config enablement, managed env application, proxy/mTLS setup, API preconnect, telemetry bootstrap, Windows shell setup, LSP cleanup registration, and scratchpad setup all start here.

### Core execution model

- `src/QueryEngine.ts` is the conversation engine.
  - It owns turn-by-turn session state, message history, tool-call loops, usage accounting, memory prompt loading, and orchestration between model responses and tool execution.
  - Treat it as the core runtime for a Claude session.
- `src/query.ts` and related `src/query/` modules support the lower-level query pipeline used by the engine.
- `src/context.ts` and `src/context/` gather repo/user/system context that feeds prompts.

### Commands, tools, skills

- `src/commands.ts` is the slash-command registry.
  - It statically imports the standard command set and conditionally loads feature-gated/internal commands.
  - Individual command implementations live under `src/commands/`.
- `src/tools.ts` is the tool registry.
  - It defines the base tool list available to the model and conditionally enables tools based on feature flags, environment, and mode.
  - Tool implementations live under `src/tools/`.
- `src/skills/` contains reusable higher-level workflows.
  - `src/skills/bundled/index.ts` registers bundled skills such as config updates, remember, simplify, verify, and debug-oriented flows.
- Built-in plugins are scaffolded in `src/plugins/`, but in this snapshot `src/plugins/bundled/index.ts` does not register any built-in plugins yet.

### UI and interaction layers

- The interactive terminal UI is built with **React + Ink**.
- `src/components/` contains reusable UI components.
- `src/screens/` contains full-screen flows and larger UI surfaces.
- `src/dialogLaunchers.tsx`, `src/interactiveHelpers.tsx`, and `src/replLauncher.tsx` are important orchestration points for interactive flows.

### Configuration, settings, and policy

- Settings/config handling is spread across `src/utils/config.ts`, `src/utils/settings/`, and `src/migrations/`.
- Remote-managed settings and org policy enforcement are first-class concerns.
  - See `src/services/remoteManagedSettings/` and `src/services/policyLimits/`.
- Tool permissions are deeply integrated into the runtime; permission setup in `main.tsx` and the tool registry/runtime matter as much as the tool implementations themselves.

### Integrations and platform subsystems

- `src/services/` contains most external/system integrations:
  - API/bootstrap/auth
  - MCP client and config handling
  - analytics/feature flags
  - LSP management
  - plugin loading
  - compact/context compression
- `src/bridge/` implements IDE/remote-control bridging.
- `src/daemon/`, `src/remote/`, `src/server/`, `src/environment-runner/`, and `src/self-hosted-runner/` contain alternative runtime modes beyond the normal interactive CLI.

### State and persistence

- `src/state/` contains app-state stores and change propagation.
- `src/tasks/` and related task tools handle structured task tracking inside the app.
- `src/memdir/` handles persistent memory prompt loading.
- Session/history persistence is handled through utilities such as `src/history.ts` and `src/utils/sessionStorage.ts`.

## Important repo-specific observations

- This repo is **feature-flag heavy**. Many commands, tools, and modes are conditionally compiled or conditionally required via `feature('...')` or environment checks. Before assuming functionality is active, verify the relevant gate.
- This is a **Bun-oriented codebase**, not a standard Node CLI. Prefer Bun commands and Bun build assumptions when changing runtime behavior.
- `src/main.tsx`, `src/commands.ts`, `src/tools.ts`, and `src/QueryEngine.ts` are the fastest way to understand how a user request turns into a command/tool-enabled Claude session.
- The Windows snapshot wrapper in `scripts/run-snapshot.ps1` sets repo-local HOME/config paths under `.codex-home/` and forces the built CLI to run with those isolated settings.
- Treat this repository as a **research snapshot**: missing vendor/runtime artifacts can explain failures that would not happen in the original internal repository.

## README-derived guidance

- Keep in mind the repository’s stated purpose: educational study, defensive security research, architecture review, and supply-chain analysis.
- Do not describe this repo as an official Anthropic codebase.
