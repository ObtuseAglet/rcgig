# rcgig — Project State

## Extension Info
- Command ID: `rcgig.addToGitignore`
- Activation event: `onCommand:rcgig.addToGitignore`
- Entry point: `out/extension.js`

## Built So Far
- L1-1 complete: project scaffold, tsconfig, vitest config, stub source files

## Helper Function Contracts

### `findGitignoreFiles(): Promise<vscode.Uri[]>`
Calls `vscode.workspace.findFiles('**/.gitignore', '**/node_modules/**')` and returns the result. No transformation, no filtering — just the workspace API delegate.

### `formatEntry(fileUri: vscode.Uri, gitignoreUri: vscode.Uri): string`
Computes the path of `fileUri` relative to the directory containing `gitignoreUri` using `path.relative`, normalizes separators to POSIX `/`, and prepends `/` to produce an anchored gitignore entry. All path math uses Node's `path` module against `fsPath` values.

### `appendEntry(gitignoreUri: vscode.Uri, entry: string): Promise<'added' | 'duplicate' | 'created'>`
- Reads the file via `vscode.workspace.fs.readFile`. If the read throws (file does not exist), writes the entry as the sole content and returns `'created'`.
- If the file exists, splits content by newlines and checks for an exact line match. If found, returns `'duplicate'` without writing.
- Otherwise, appends the entry (adding a newline separator if the file doesn't end with one) and writes back via `vscode.workspace.fs.writeFile`, returning `'added'`.

## Command Flow

1. Guard: if no workspace folders are open, show error and return
2. `findGitignoreFiles()` — discovers all `.gitignore` URIs in the workspace
3. Target resolution:
   - Zero found → create `<workspaceRoot>/.gitignore` (empty) and use it
   - One found → use it directly
   - Multiple found → `showQuickPick` with workspace-relative paths; cancel returns silently
4. `formatEntry(fileUri, targetUri)` → anchored POSIX path string (e.g. `/src/foo.log`)
5. `appendEntry(targetUri, entry)`:
   - `'duplicate'` → info message: "Already in .gitignore."
   - `'added'` / `'created'` → info message: "Added `<entry>` to `<relative path>`"
