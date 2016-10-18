import {TemplateQuickPickItem} from './TemplateQuickPickItem';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class TemplateManager {

    templateDirectory = vscode.extensions.getExtension('jchannon.csharpextensions').extensionPath + '/templates/';

    installMessage = 'Install';

    createTemplate() {
        vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Please enter template name', value: "templateName.tmpl" }).then(result => {
            let newTemplateFileName = path.join(this.templateDirectory, result);
            this.createNewTemplateFile(newTemplateFileName);
            this.openTemplate(newTemplateFileName);
        });
    }

    editTemplate() {
        this.showTemplateQuickPick()
            .then(selectedTemplate => {
                var templateFileName = path.join(this.templateDirectory, selectedTemplate.template + '.tmpl');
                this.openTemplate(templateFileName);
            });
    }

    openTemplate(template: string) {
        execFile('code', [this.templateDirectory, template], (error: any, stdout, stderr) => {
            if (error.code === 'ENOENT') {
                vscode.window.showErrorMessage('Please install \'code\' command into the PATH', this.installMessage).then(value => {
                    if (value === this.installMessage) {
                        vscode.commands.executeCommand('workbench.action.installCommandLine');
                    }
                });
            }
        });
    }

    showTemplateQuickPick(): Thenable<TemplateQuickPickItem> {
        let templates = this.getTemplateQuickPickItems();
        return vscode.window.showQuickPick(Promise.all<TemplateQuickPickItem>(templates) as Thenable<Iterable<TemplateQuickPickItem>>);
    }

    getTemplateQuickPickItems(): PromiseLike<TemplateQuickPickItem>[] {
        let templateDirectory = vscode.extensions.getExtension('jchannon.csharpextensions').extensionPath + '/templates/';
        return fs.readdirSync(templateDirectory).map(file => {
            let templateName = path.basename(file, '.tmpl');
            return vscode.workspace.openTextDocument(path.join(templateDirectory, file)).then(doc => {
                let text = doc.getText();
                let regex = /\$\{Description:(.*)\}/i;
                let description = text.match(regex)[1];
                return new TemplateQuickPickItem(templateName, description, "", templateName);
            });
        });
    }

    createNewTemplateFile(newTemplateFile: string) {
        if (!fs.exists(newTemplateFile)) {
            fs.writeFileSync(newTemplateFile, `\${Description: Template Description Here}
//use \${namespace} to set namespace
//use \${name} to set name
//use \${cursor} to set where the cursor will go when the file is first opened
        `);
        }
    }

    findCursorInTemlpate(text: string) {
        let cursorPos = text.indexOf('${cursor}');
        let preCursor = text.substr(0, cursorPos);
        let lineNum = preCursor.match(/\n/gi).length;
        let charNum = preCursor.substr(preCursor.lastIndexOf('\n')).length;
        return new vscode.Position(lineNum, charNum);
    }
}