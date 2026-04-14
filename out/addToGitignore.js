"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findGitignoreFiles = findGitignoreFiles;
exports.formatEntry = formatEntry;
exports.appendEntry = appendEntry;
const vscode = require("vscode");
const path = require("path");
async function findGitignoreFiles() {
    return vscode.workspace.findFiles('**/.gitignore', '**/node_modules/**');
}
function formatEntry(fileUri, gitignoreUri) {
    const gitignoreDir = path.dirname(gitignoreUri.fsPath);
    const relativePath = path.relative(gitignoreDir, fileUri.fsPath);
    const posixPath = relativePath.split(path.sep).join('/');
    return `/${posixPath}`;
}
async function appendEntry(gitignoreUri, entry) {
    let existingContent;
    try {
        const rawBytes = await vscode.workspace.fs.readFile(gitignoreUri);
        existingContent = Buffer.from(rawBytes).toString('utf-8');
    }
    catch {
        const newContent = Buffer.from(`${entry}\n`, 'utf-8');
        await vscode.workspace.fs.writeFile(gitignoreUri, newContent);
        return 'created';
    }
    const lines = existingContent.split('\n');
    if (lines.some(line => line === entry)) {
        return 'duplicate';
    }
    const separator = existingContent.endsWith('\n') ? '' : '\n';
    const updatedContent = `${existingContent}${separator}${entry}\n`;
    await vscode.workspace.fs.writeFile(gitignoreUri, Buffer.from(updatedContent, 'utf-8'));
    return 'added';
}
