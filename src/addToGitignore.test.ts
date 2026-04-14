import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('vscode', () => {
  return {
    workspace: {
      findFiles: vi.fn(),
      fs: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
      },
    },
    Uri: {
      file: (fsPath: string) => ({ fsPath, scheme: 'file' }),
    },
  }
})

import { findGitignoreFiles, formatEntry, appendEntry } from './addToGitignore'
import * as vscode from 'vscode'

const mockFindFiles = vscode.workspace.findFiles as ReturnType<typeof vi.fn>
const mockReadFile = vscode.workspace.fs.readFile as ReturnType<typeof vi.fn>
const mockWriteFile = vscode.workspace.fs.writeFile as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('findGitignoreFiles', () => {
  it('delegates to vscode.workspace.findFiles with correct glob patterns', async () => {
    const fakeUris = [vscode.Uri.file('/workspace/.gitignore')]
    mockFindFiles.mockResolvedValue(fakeUris)

    const result = await findGitignoreFiles()

    expect(mockFindFiles).toHaveBeenCalledWith('**/.gitignore', '**/node_modules/**')
    expect(result).toEqual(fakeUris)
  })
})

describe('formatEntry', () => {
  it('returns anchored filename when file is alongside .gitignore', () => {
    const fileUri = vscode.Uri.file('/workspace/secret.env')
    const gitignoreUri = vscode.Uri.file('/workspace/.gitignore')

    expect(formatEntry(fileUri, gitignoreUri)).toBe('/secret.env')
  })

  it('returns anchored nested path for files in subdirectories', () => {
    const fileUri = vscode.Uri.file('/workspace/src/nested/file.ts')
    const gitignoreUri = vscode.Uri.file('/workspace/.gitignore')

    expect(formatEntry(fileUri, gitignoreUri)).toBe('/src/nested/file.ts')
  })

  it('computes path relative to the subdirectory containing .gitignore', () => {
    const fileUri = vscode.Uri.file('/workspace/packages/foo/src/secret.env')
    const gitignoreUri = vscode.Uri.file('/workspace/packages/foo/.gitignore')

    expect(formatEntry(fileUri, gitignoreUri)).toBe('/src/secret.env')
  })
})

describe('appendEntry', () => {
  it('appends entry to existing file and returns "added"', async () => {
    const gitignoreUri = vscode.Uri.file('/workspace/.gitignore')
    const existingContent = '*.log\nnode_modules/\n'
    mockReadFile.mockResolvedValue(Buffer.from(existingContent, 'utf-8'))

    const result = await appendEntry(gitignoreUri, '/secret.env')

    expect(result).toBe('added')
    expect(mockWriteFile).toHaveBeenCalledOnce()
    const writtenBytes = mockWriteFile.mock.calls[0][1] as Buffer
    const writtenContent = writtenBytes.toString('utf-8')
    expect(writtenContent).toBe('*.log\nnode_modules/\n/secret.env\n')
  })

  it('returns "duplicate" and does not write when entry already exists', async () => {
    const gitignoreUri = vscode.Uri.file('/workspace/.gitignore')
    const existingContent = '/secret.env\nnode_modules/\n'
    mockReadFile.mockResolvedValue(Buffer.from(existingContent, 'utf-8'))

    const result = await appendEntry(gitignoreUri, '/secret.env')

    expect(result).toBe('duplicate')
    expect(mockWriteFile).not.toHaveBeenCalled()
  })

  it('creates the file with entry when it does not exist and returns "created"', async () => {
    const gitignoreUri = vscode.Uri.file('/workspace/.gitignore')
    mockReadFile.mockRejectedValue(new Error('file not found'))

    const result = await appendEntry(gitignoreUri, '/secret.env')

    expect(result).toBe('created')
    expect(mockWriteFile).toHaveBeenCalledOnce()
    const writtenBytes = mockWriteFile.mock.calls[0][1] as Buffer
    expect(writtenBytes.toString('utf-8')).toBe('/secret.env\n')
  })

  it('inserts newline separator when existing file lacks trailing newline', async () => {
    const gitignoreUri = vscode.Uri.file('/workspace/.gitignore')
    const existingContent = '*.log\nnode_modules/'
    mockReadFile.mockResolvedValue(Buffer.from(existingContent, 'utf-8'))

    const result = await appendEntry(gitignoreUri, '/secret.env')

    expect(result).toBe('added')
    const writtenBytes = mockWriteFile.mock.calls[0][1] as Buffer
    const writtenContent = writtenBytes.toString('utf-8')
    expect(writtenContent).toBe('*.log\nnode_modules/\n/secret.env\n')
  })
})
