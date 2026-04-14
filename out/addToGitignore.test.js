"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('vscode', () => {
    return {
        workspace: {
            findFiles: vitest_1.vi.fn(),
            fs: {
                readFile: vitest_1.vi.fn(),
                writeFile: vitest_1.vi.fn(),
            },
        },
        Uri: {
            file: (fsPath) => ({ fsPath, scheme: 'file' }),
        },
    };
});
const addToGitignore_1 = require("./addToGitignore");
const vscode = require("vscode");
const mockFindFiles = vscode.workspace.findFiles;
const mockReadFile = vscode.workspace.fs.readFile;
const mockWriteFile = vscode.workspace.fs.writeFile;
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.clearAllMocks();
});
(0, vitest_1.describe)('findGitignoreFiles', () => {
    (0, vitest_1.it)('delegates to vscode.workspace.findFiles with correct glob patterns', async () => {
        const fakeUris = [vscode.Uri.file('/workspace/.gitignore')];
        mockFindFiles.mockResolvedValue(fakeUris);
        const result = await (0, addToGitignore_1.findGitignoreFiles)();
        (0, vitest_1.expect)(mockFindFiles).toHaveBeenCalledWith('**/.gitignore', '**/node_modules/**');
        (0, vitest_1.expect)(result).toEqual(fakeUris);
    });
});
(0, vitest_1.describe)('formatEntry', () => {
    (0, vitest_1.it)('returns anchored filename when file is alongside .gitignore', () => {
        const fileUri = vscode.Uri.file('/workspace/secret.env');
        const gitignoreUri = vscode.Uri.file('/workspace/.gitignore');
        (0, vitest_1.expect)((0, addToGitignore_1.formatEntry)(fileUri, gitignoreUri)).toBe('/secret.env');
    });
    (0, vitest_1.it)('returns anchored nested path for files in subdirectories', () => {
        const fileUri = vscode.Uri.file('/workspace/src/nested/file.ts');
        const gitignoreUri = vscode.Uri.file('/workspace/.gitignore');
        (0, vitest_1.expect)((0, addToGitignore_1.formatEntry)(fileUri, gitignoreUri)).toBe('/src/nested/file.ts');
    });
    (0, vitest_1.it)('computes path relative to the subdirectory containing .gitignore', () => {
        const fileUri = vscode.Uri.file('/workspace/packages/foo/src/secret.env');
        const gitignoreUri = vscode.Uri.file('/workspace/packages/foo/.gitignore');
        (0, vitest_1.expect)((0, addToGitignore_1.formatEntry)(fileUri, gitignoreUri)).toBe('/src/secret.env');
    });
});
(0, vitest_1.describe)('appendEntry', () => {
    (0, vitest_1.it)('appends entry to existing file and returns "added"', async () => {
        const gitignoreUri = vscode.Uri.file('/workspace/.gitignore');
        const existingContent = '*.log\nnode_modules/\n';
        mockReadFile.mockResolvedValue(Buffer.from(existingContent, 'utf-8'));
        const result = await (0, addToGitignore_1.appendEntry)(gitignoreUri, '/secret.env');
        (0, vitest_1.expect)(result).toBe('added');
        (0, vitest_1.expect)(mockWriteFile).toHaveBeenCalledOnce();
        const writtenBytes = mockWriteFile.mock.calls[0][1];
        const writtenContent = writtenBytes.toString('utf-8');
        (0, vitest_1.expect)(writtenContent).toBe('*.log\nnode_modules/\n/secret.env\n');
    });
    (0, vitest_1.it)('returns "duplicate" and does not write when entry already exists', async () => {
        const gitignoreUri = vscode.Uri.file('/workspace/.gitignore');
        const existingContent = '/secret.env\nnode_modules/\n';
        mockReadFile.mockResolvedValue(Buffer.from(existingContent, 'utf-8'));
        const result = await (0, addToGitignore_1.appendEntry)(gitignoreUri, '/secret.env');
        (0, vitest_1.expect)(result).toBe('duplicate');
        (0, vitest_1.expect)(mockWriteFile).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('creates the file with entry when it does not exist and returns "created"', async () => {
        const gitignoreUri = vscode.Uri.file('/workspace/.gitignore');
        mockReadFile.mockRejectedValue(new Error('file not found'));
        const result = await (0, addToGitignore_1.appendEntry)(gitignoreUri, '/secret.env');
        (0, vitest_1.expect)(result).toBe('created');
        (0, vitest_1.expect)(mockWriteFile).toHaveBeenCalledOnce();
        const writtenBytes = mockWriteFile.mock.calls[0][1];
        (0, vitest_1.expect)(writtenBytes.toString('utf-8')).toBe('/secret.env\n');
    });
    (0, vitest_1.it)('inserts newline separator when existing file lacks trailing newline', async () => {
        const gitignoreUri = vscode.Uri.file('/workspace/.gitignore');
        const existingContent = '*.log\nnode_modules/';
        mockReadFile.mockResolvedValue(Buffer.from(existingContent, 'utf-8'));
        const result = await (0, addToGitignore_1.appendEntry)(gitignoreUri, '/secret.env');
        (0, vitest_1.expect)(result).toBe('added');
        const writtenBytes = mockWriteFile.mock.calls[0][1];
        const writtenContent = writtenBytes.toString('utf-8');
        (0, vitest_1.expect)(writtenContent).toBe('*.log\nnode_modules/\n/secret.env\n');
    });
});
