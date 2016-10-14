import * as vscode from 'vscode';

export class TemplateQuickPickItem implements vscode.QuickPickItem
{
    constructor(public label: string, 
                public description: string, 
                public detail: string, 
                public template: string ){
                }
}