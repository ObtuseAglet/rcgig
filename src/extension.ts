import * as vscode from 'vscode'
import { findGitignoreFiles, formatEntry, appendEntry } from './addToGitignore'

export async function activate(context: vscode.ExtensionContext) {
  if (!vscode.workspace.workspaceFolders?.length) {
    vscode.window.showErrorMessage('rcgig requires an open workspace.')
    return
  }

  const disposable = vscode.commands.registerCommand(
    'rcgig.addToGitignore',
    async (fileUri: vscode.Uri) => {
      const gitignoreFiles = await findGitignoreFiles()

      let targetUri: vscode.Uri

      if (gitignoreFiles.length === 0) {
        const workspaceRoot = vscode.workspace.workspaceFolders![0].uri
        targetUri = vscode.Uri.joinPath(workspaceRoot, '.gitignore')
        await vscode.workspace.fs.writeFile(targetUri, new Uint8Array())
      } else if (gitignoreFiles.length === 1) {
        targetUri = gitignoreFiles[0]
      } else {
        const picked = await vscode.window.showQuickPick(
          gitignoreFiles.map(uri => vscode.workspace.asRelativePath(uri))
        )
        if (picked === undefined) return

        targetUri = gitignoreFiles.find(
          uri => vscode.workspace.asRelativePath(uri) === picked
        )!
      }

      const entry = formatEntry(fileUri, targetUri)
      const result = await appendEntry(targetUri, entry)

      if (result === 'duplicate') {
        vscode.window.showInformationMessage('Already in .gitignore.')
      } else {
        vscode.window.showInformationMessage(
          `Added ${entry} to ${vscode.workspace.asRelativePath(targetUri)}`
        )
      }
    }
  )

  context.subscriptions.push(disposable)
}

export function deactivate() {}
