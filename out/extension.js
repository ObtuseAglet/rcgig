"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const addToGitignore_1 = require("./addToGitignore");
async function activate(context) {
    if (!vscode.workspace.workspaceFolders?.length) {
        vscode.window.showErrorMessage('rcgig requires an open workspace.');
        return;
    }
    const disposable = vscode.commands.registerCommand('rcgig.addToGitignore', async (fileUri) => {
        const gitignoreFiles = await (0, addToGitignore_1.findGitignoreFiles)();
        let targetUri;
        if (gitignoreFiles.length === 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            targetUri = vscode.Uri.joinPath(workspaceRoot, '.gitignore');
            await vscode.workspace.fs.writeFile(targetUri, new Uint8Array());
        }
        else if (gitignoreFiles.length === 1) {
            targetUri = gitignoreFiles[0];
        }
        else {
            const picked = await vscode.window.showQuickPick(gitignoreFiles.map(uri => vscode.workspace.asRelativePath(uri)));
            if (picked === undefined)
                return;
            targetUri = gitignoreFiles.find(uri => vscode.workspace.asRelativePath(uri) === picked);
        }
        const entry = (0, addToGitignore_1.formatEntry)(fileUri, targetUri);
        const result = await (0, addToGitignore_1.appendEntry)(targetUri, entry);
        if (result === 'duplicate') {
            vscode.window.showInformationMessage('Already in .gitignore.');
        }
        else {
            vscode.window.showInformationMessage(`Added ${entry} to ${vscode.workspace.asRelativePath(targetUri)}`);
        }
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
