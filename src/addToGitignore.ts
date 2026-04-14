import * as vscode from 'vscode'
import * as path from 'path'

export async function findGitignoreFiles(): Promise<vscode.Uri[]> {
  return vscode.workspace.findFiles('**/.gitignore', '**/node_modules/**')
}

export function formatEntry(fileUri: vscode.Uri, gitignoreUri: vscode.Uri): string {
  const gitignoreDir = path.dirname(gitignoreUri.fsPath)
  const relativePath = path.relative(gitignoreDir, fileUri.fsPath)
  const posixPath = relativePath.split(path.sep).join('/')
  return `/${posixPath}`
}

export async function appendEntry(
  gitignoreUri: vscode.Uri,
  entry: string
): Promise<'added' | 'duplicate' | 'created'> {
  let existingContent: string

  try {
    const rawBytes = await vscode.workspace.fs.readFile(gitignoreUri)
    existingContent = Buffer.from(rawBytes).toString('utf-8')
  } catch {
    const newContent = Buffer.from(`${entry}\n`, 'utf-8')
    await vscode.workspace.fs.writeFile(gitignoreUri, newContent)
    return 'created'
  }

  const lines = existingContent.split('\n')
  if (lines.some(line => line === entry)) {
    return 'duplicate'
  }

  const separator = existingContent.endsWith('\n') ? '' : '\n'
  const updatedContent = `${existingContent}${separator}${entry}\n`
  await vscode.workspace.fs.writeFile(gitignoreUri, Buffer.from(updatedContent, 'utf-8'))
  return 'added'
}
