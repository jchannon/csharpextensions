'use strict';
import { ensureExtension } from './helpers';
import { TemplateManager } from './TemplateManager';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var parentfinder = require('find-parent-dir');

const templateManager = new TemplateManager();
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('extension.createFromList', createFromList));
    context.subscriptions.push(vscode.commands.registerCommand('extension.createTemplate', templateManager.createTemplate));
    context.subscriptions.push(vscode.commands.registerCommand('extension.editTemplate', templateManager.editTemplate));
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function createFromList(args) {
    templateManager.showTemplateQuickPick()
        .then(selectedTemplate => {
            promptAndSave(args, selectedTemplate.template);
        });
}

function promptAndSave(args, templatetype: string) {
    if (args === null) {
        args = { _fsPath: vscode.workspace.rootPath }
    }
    let incomingpath: string = args._fsPath;
    vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Please enter filename', value: 'new' + templatetype + '.cs' })
        .then((filename) => {
            if (typeof filename === 'undefined') {
                return;
            }

            filename = incomingpath + path.sep + filename;

            ensureExtension(filename, 'cs');

            var originalfilename = filename;

            var parentdir = parentfinder.sync(path.dirname(filename), 'project.json');
            if (parentdir[parentdir.length - 1] === path.sep) {
                parentdir = parentdir.substr(0, parentdir.length - 1);
            }

            var newroot = parentdir.substr(parentdir.lastIndexOf(path.sep) + 1);

            var filenamechildpath = filename.substring(filename.lastIndexOf(newroot));

            var pathSepRegEx = /\//g;
            if (os.platform() === "win32") {
                pathSepRegEx = /\\/g;
            }

            var namespace = path.dirname(filenamechildpath);
            namespace = namespace.replace(pathSepRegEx, '.');

            namespace = namespace.replace('-', '_');

            filename = path.basename(filename, '.cs');

            openTemplateAndSaveNewFile(templatetype, namespace, filename, originalfilename);
        });
}

function openTemplateAndSaveNewFile(type: string, namespace: string, filename: string, originalfilename: string) {

    let templatefileName = type + '.tmpl';

    vscode.workspace.openTextDocument(path.join(templateManager.templateDirectory, templatefileName))
        .then((doc: vscode.TextDocument) => {
            let text = doc.getText();
            text = text.replace('${namespace}', namespace);
            text = text.replace('${name}', filename);
            text = text.replace(new RegExp(/\$\{Description:(.*)\n/i), '');
            let cursorPosition = templateManager.findCursorInTemlpate(text);
            text = text.replace('${cursor}', '');
            fs.writeFileSync(originalfilename, text);

            vscode.workspace.openTextDocument(originalfilename).then((doc) => {
                vscode.window.showTextDocument(doc).then((editor) => {
                    let newselection = new vscode.Selection(cursorPosition, cursorPosition);
                    editor.selection = newselection;
                });
            });
        });
}