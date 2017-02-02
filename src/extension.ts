'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import CodeActionProvider from './codeActionProvider';
const parentfinder = require('find-parent-dir');
const findupglob = require('find-up-glob');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const documentSelector: vscode.DocumentSelector = {
        language: 'csharp',
        scheme: 'file'
    };
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    //console.log('Congratulations, your extension "newclassextension" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    // let disposable = vscode.commands.registerCommand('extension.sayHello', (args) => {
    //     // The code you place here will be executed every time your command is executed
    //     // Display a message box to the user
    //     vscode.window.showInformationMessage('Hello World!');
    // });

    //context.subscriptions.push(disposable);
    context.subscriptions.push(vscode.commands.registerCommand('csharpextensions.createClass', createClass));
    context.subscriptions.push(vscode.commands.registerCommand('csharpextensions.createInterface', createInterface));

    const codeActionProvider = new CodeActionProvider();
    let disposable = vscode.languages.registerCodeActionsProvider(documentSelector, codeActionProvider);
    context.subscriptions.push(disposable);
}

function createClass(args) {
    promptAndSave(args, 'class');
}

function createInterface(args) {
    promptAndSave(args, 'interface');
}

function promptAndSave(args, templatetype: string) {
    if (args == null) {
        args = { _fsPath: vscode.workspace.rootPath }
    }
    let incomingpath: string = args._fsPath;
    vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Please enter filename', value: 'new' + templatetype + '.cs' })
        .then((newfilename) => {

            if (typeof newfilename === 'undefined') {
                return;
            }

            var newfilepath = incomingpath + path.sep + newfilename;

            newfilepath = correctExtension(newfilepath);

            var originalfilepath = newfilepath;

            var projectrootdir = getProjectRootDirOfFilePath(newfilepath);

            if (projectrootdir == null) {
                vscode.window.showErrorMessage("Unable to find project.json or *.csproj");
                return;
            }

            projectrootdir = removeTrailingSeparator(projectrootdir);

            var newroot = projectrootdir.substr(projectrootdir.lastIndexOf(path.sep) + 1);

            var filenamechildpath = newfilepath.substring(newfilepath.lastIndexOf(newroot));

            var pathSepRegEx = /\//g;
            if (os.platform() === "win32")
                pathSepRegEx = /\\/g;

            var namespace = path.dirname(filenamechildpath);
            namespace = namespace.replace(pathSepRegEx, '.');

            namespace = namespace.replace(/\s+/g, "_");
            namespace = namespace.replace(/-/g, "_");

            newfilepath = path.basename(newfilepath, '.cs');

            openTemplateAndSaveNewFile(templatetype, namespace, newfilepath, originalfilepath);
        });
}

function correctExtension(filename) {
    if (path.extname(filename) !== '.cs') {
        if (filename.endsWith('.')) {
            filename = filename + 'cs';
        } else {
            filename = filename + '.cs';
        }
    }
    return filename;
}

function removeTrailingSeparator(filepath) {
    if (filepath[filepath.length - 1] === path.sep) {
        filepath = filepath.substr(0, filepath.length - 1);
    }
    return filepath;
}

function getProjectRootDirOfFilePath(filepath) {
    var projectrootdir = parentfinder.sync(path.dirname(filepath), 'project.json');
    if (projectrootdir == null) {
        var csprojfiles = findupglob.sync('*.csproj', { cwd: path.dirname(filepath) });
        if (csprojfiles == null) {
            return null;
        }
        projectrootdir = path.dirname(csprojfiles[0]);
    }
    return projectrootdir;
}

function openTemplateAndSaveNewFile(type: string, namespace: string, filename: string, originalfilepath: string) {

    let templatefileName = type + '.tmpl';

    vscode.workspace.openTextDocument(vscode.extensions.getExtension('jchannon.csharpextensions').extensionPath + '/templates/' + templatefileName)
        .then((doc: vscode.TextDocument) => {
            let text = doc.getText();
            text = text.replace('${namespace}', namespace);
            text = text.replace('${classname}', filename);
            let cursorPosition = findCursorInTemlpate(text);
            text = text.replace('${cursor}', '');
            fs.writeFileSync(originalfilepath, text);

            vscode.workspace.openTextDocument(originalfilepath).then((doc) => {
                vscode.window.showTextDocument(doc).then((editor) => {
                    let newselection = new vscode.Selection(cursorPosition, cursorPosition);
                    editor.selection = newselection;
                });
            });
        });
}

function findCursorInTemlpate(text: string) {
    let cursorPos = text.indexOf('${cursor}');
    let preCursor = text.substr(0, cursorPos);
    let lineNum = preCursor.match(/\n/gi).length;
    let charNum = preCursor.substr(preCursor.lastIndexOf('\n')).length;
    return new vscode.Position(lineNum, charNum);

}

// this method is called when your extension is deactivated
export function deactivate() {
}
