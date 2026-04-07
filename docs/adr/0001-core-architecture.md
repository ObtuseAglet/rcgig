# ADR 0001: Core Architecture for rcgig

**Date:** 2026-04-07
**Status:** Accepted

---

## Context

rcgig is a VS Code extension that lets users right-click a file in the Explorer and add it to a `.gitignore` file. Several foundational decisions needed to be made before writing any code: how the extension locates `.gitignore` files, how it formats the path entry, which file it targets when multiple exist, and what to do when none exist. This ADR records those decisions.

---

## Decisions

### 1. Implementation strategy: Pure VS Code Extension API

**Options considered:**
- Pure VS Code Extension API (`vscode.workspace`, `vscode.window`, `vscode.workspace.fs`)
- Shell out to the git CLI (`child_process` + `git rev-parse`, `git ls-files`)
- Delegate to VS Code's built-in Git extension API (`vscode.extensions.getExtension('vscode.git')`)

**Decision:** Use the pure VS Code Extension API exclusively.

**Rationale:** Zero external dependencies. The VS Code filesystem and workspace APIs are sufficient for everything needed — file discovery, I/O, and UI — and work identically on Windows, macOS, and Linux without PATH resolution headaches. The git CLI approach introduces a runtime dependency on git being accessible from the extension host's environment, which is unreliable. The built-in git extension API creates a fragile dependency on a separate extension being enabled.

---

### 2. Target `.gitignore` selection: user picker when multiple exist

**Options considered:**
- Always target the repo root `.gitignore`
- Target the nearest `.gitignore` walking up from the file's directory
- Present a quick pick when multiple `.gitignore` files exist in the workspace

**Decision:** Use `vscode.window.showQuickPick` to let the user choose when multiple `.gitignore` files are found. If exactly one exists, use it directly. If none exist, auto-create one at the workspace root.

**Rationale:** Monorepos and nested packages commonly have multiple `.gitignore` files with different scopes. Silently targeting the root or the nearest file can produce the wrong result in either direction. The picker costs one extra click in the rare multi-file case and eliminates a class of silent misbehavior. Auto-creating at workspace root when none exists removes friction for new projects.

---

### 3. Path entry format: anchored with leading slash

**Options considered:**
- Filename only (e.g., `secret.env`)
- Path relative to the `.gitignore` file's directory (e.g., `src/secret.env`)
- Anchored path with leading slash (e.g., `/src/secret.env`)

**Decision:** Write entries as paths anchored with a leading `/`, relative to the directory containing the chosen `.gitignore`.

**Rationale:** A bare filename matches that name anywhere in the subtree, which is rarely the user's intent when right-clicking a specific file. A leading slash in gitignore syntax anchors the pattern to the directory containing the `.gitignore` file, matching exactly the file the user targeted. This is the most precise and least surprising behavior.

---

### 4. Multi-file selection: not supported

**Decision:** The command operates on a single file only.

**Rationale:** Multi-select adds surface area (batch error handling, partial failure states, confirmation UX) with limited payoff — adding files to `.gitignore` is not a high-frequency bulk operation. This can be revisited if real usage proves otherwise.

---

### 5. Duplicate handling: silent no-op with feedback

**Decision:** If the formatted entry already exists verbatim in the target `.gitignore`, do not write anything. Show an info message: "Already in .gitignore."

**Rationale:** Appending duplicates produces a valid but messy gitignore. An exact-string check before writing is cheap and keeps the file clean. Silently doing nothing without feedback would be confusing, so the info message closes the loop.

---

## File Structure

```
src/
  extension.ts          # Activation entry point; registers rcgig.addToGitignore
  addToGitignore.ts     # Command handler + helpers: findGitignoreFiles, formatEntry, appendEntry
```

`package.json` contributes the command to `explorer/context` with `"when": "!explorerResourceIsFolder"` to restrict it to files.

---

## Consequences

- No dependency on git being installed or on the PATH
- Works in any workspace, not just git repositories (the extension will simply create a `.gitignore` in the workspace root if none exists)
- Anchored entries are precise but mean the same file added via a different `.gitignore` picker choice produces a different (also valid) entry
- The exact-match duplicate check does not catch semantically equivalent patterns (e.g., `*.log` already covering `debug.log`) — out of scope for v1
