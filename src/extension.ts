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

    let promptPrefix = templatetype === 'interface' ? 'INew' : 'New';
    vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Please enter filename', value: promptPrefix + capitalize(templatetype) + '.cs'})
        .then((newfilename) => {

            if (typeof newfilename === 'undefined') {
                return;
            }

            let newfilepath = incomingpath + path.sep + newfilename;

            if (fs.existsSync(newfilepath)) {
                vscode.window.showErrorMessage("File already exists");
                return;
            }

            newfilepath = correctExtension(newfilepath);

            let originalfilepath = newfilepath;

            let projectrootdir = getProjectRootDirOfFilePath(newfilepath);

            if (projectrootdir == null) {
                vscode.window.showErrorMessage("Unable to find project.json or *.csproj");
                return;
            }

            let filenamechildpath = newfilepath.slice(projectrootdir.length);
            if(filenamechildpath .startsWith(path.sep)) {
                filenamechildpath = filenamechildpath.substring(1);
            }

            let namespaceTokens = path.dirname(filenamechildpath)
                                    .split(path.sep)
                                    .filter(token => token.trim.length <= 0);
            if(vscode.workspace.getConfiguration().get('csharpextensions.namespace.capitalize')) {
                namespaceTokens = namespaceTokens.map(item => capitalize(item));
            }
            let namespaceTokenMappings = vscode.workspace.getConfiguration().get('csharpextensions.namespace.tokenMappings');
            if(namespaceTokenMappings instanceof Object) {
                namespaceTokens = namespaceTokens.map(item => 
                    namespaceTokenMappings[item.toLowerCase()] != null ? 
                    namespaceTokenMappings[item.toLowerCase()] : item);
            }

            let namespace = namespaceTokens.join('.');
            namespace = namespace.replace(/\s+/g, "_");
            namespace = namespace.replace(/-/g, "_");

            // Chomp of .cs and other extension like MyClass.Writer.cs for partial classes.
            let classname = newfilename.substring(0, newfilename.indexOf('.'));
            openTemplateAndSaveNewFile(templatetype, namespace, classname, originalfilepath);
        });
}

function capitalize(word : string) {
    return word.charAt(0).toUpperCase() + word.substr(1);
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

function openTemplateAndSaveNewFile(type: string, namespace: string, classname: string, originalfilepath: string) {

    let templatefileName = type + '.tmpl';

    vscode.workspace.openTextDocument(vscode.extensions.getExtension('jchannon.csharpextensions').extensionPath + '/templates/' + templatefileName)
        .then((doc: vscode.TextDocument) => {
            
            let text = doc.getText();
            text = text.replace('${namespace}', namespace);
            text = text.replace('${classname}', classname);
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
