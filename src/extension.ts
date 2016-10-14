'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
var parentfinder = require('find-parent-dir');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

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
    context.subscriptions.push(vscode.commands.registerCommand('extension.createClass', createClass));
}

function createClass(args) {
    let incomingpath: string = args._fsPath;
    vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Please enter filename', value: incomingpath + path.sep + 'newclass.cs' })
        .then((filename) => {

            var originalfilename = filename;

            var parentdir = parentfinder.sync(path.dirname(filename), 'project.json');
            if (parentdir[parentdir.length - 1] === path.sep) {
                parentdir = parentdir.substr(0, parentdir.length - 1);
            }

            var newroot = parentdir.substr(parentdir.lastIndexOf('/') + 1);

            var filenamechildpath = filename.substring(filename.lastIndexOf(newroot));

            var namespace = path.dirname(filenamechildpath);
            namespace = namespace.replace(new RegExp(path.sep, 'g'), '.');

            filename = path.basename(filename, '.cs');

            openTemplateAndSaveNewFile('class', namespace, filename, originalfilename);
        });
}

function openTemplateAndSaveNewFile(type: string, namespace: string, filename: string, originalfilename: string) {

    var templatefileName = 'class.tmpl';

    vscode.workspace.openTextDocument(vscode.extensions.getExtension('jchannon.csharpextensions').extensionPath + '/templates/' + templatefileName)
        .then((doc: vscode.TextDocument) => {
            var text = doc.getText();
            text = text.replace('${namespace}', namespace);
            text = text.replace('${classname}', filename);
            fs.writeFileSync(originalfilename, text);
            vscode.workspace.openTextDocument(originalfilename).then((doc) => {
                vscode.window.showTextDocument(doc);
            });
        });

}

// this method is called when your extension is deactivated
export function deactivate() {
}