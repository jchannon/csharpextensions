'use strict'
import *  as vscode from 'vscode';

export default class CodeActionProvider implements vscode.CodeActionProvider{
    private _commandId;
    constructor() {
        this._commandId = 'csharpextensions.initializeMemberFromCtor';
        vscode.commands.registerCommand(this._commandId,this.initializeMemberFromCtor,this);
    }

    private initializeMemberFromCtor(args:InitializeFieldFromConstructor) {
        let edit = new vscode.WorkspaceEdit();
        
        var bodyStartRange = new vscode.Range(args.constructorBodyStart, args.constructorBodyStart)
        var declarationRange = new vscode.Range(args.constructorStart, args.constructorStart);        
        
        let declarationEdit = new vscode.TextEdit(declarationRange, args.privateDeclaration);
        let memberInitEdit = new vscode.TextEdit(bodyStartRange, args.memberInitialization);                        

        var edits = [];
        if(args.document.getText().indexOf(args.privateDeclaration.trim())== -1){
            edits.push(declarationEdit);
        }
        
        edits.push(memberInitEdit);
        edit.set(args.document.uri, edits);
        
        vscode.workspace.applyEdit(edit);
    }
    
     public provideCodeActions(document:vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken) : vscode.Command[] {
        const editor = vscode.window.activeTextEditor;        
        const position = editor.selection.active;
        var surrounding = document.getText(new vscode.Range(new vscode.Position(position.line-2,0),new vscode.Position(position.line+2,0)));
        let wordRange = editor.document.getWordRangeAtPosition(position);
        
        var regex = new RegExp(/(public|private|protected)\s(.*)\(([\s\S]*?)\)/gi);
        var matches = regex.exec(surrounding);

        var ctorStartPos = editor.document.getText().indexOf(matches[0]);        

        var ctorParamStr = matches[3];
        let parameters = {};
        ctorParamStr.split(',').forEach((match)=>{
            var separated = match.trim().split(' ');
            var type = separated[0].trim();
            var name = separated[1].trim();
            parameters[name] = type;
        });
        
        var lineText = editor.document.getText(new vscode.Range(position.line,0,position.line,wordRange.end.character));
        var selectedName = lineText.substr(wordRange.start.character,wordRange.end.character-wordRange.start.character);
        var parameterType  = parameters[selectedName];
        if(!parameterType){
            return;
        }
        
        var tabSize = vscode.workspace.getConfiguration().get('editor.tabSize',4);
        var parameter:InitializeFieldFromConstructor = {
            document: document,            
            type: parameterType,
            name: selectedName,
            privateDeclaration: `${Array(tabSize*2).join(' ')} private readonly ${parameterType} _${selectedName};\r\n`,
            memberInitialization: `${Array(tabSize*3).join(' ')} _${selectedName} = ${selectedName};\r\n`,
            constructorBodyStart: this.findConstructorBodyStart(document,position),
            constructorStart: this.findConstructorStart(document,position)
        };

        console.log(parameter);
                 
        let cmd: vscode.Command = {
            title: "Initialize field from parameter...",
            command: this._commandId,
            arguments: [parameter]
        };
        return [cmd];         
    }



    private findConstructorBodyStart(document:vscode.TextDocument, position:vscode.Position): vscode.Position{                
        for (var lineNo = position.line; lineNo < position.line+5; lineNo++) {
            var line = document.lineAt(lineNo);
            var braceIdx = line.text.indexOf('{');
            if(braceIdx != -1){
                return new vscode.Position(lineNo+1,0);
            }            
        }
        return null;        
    }
    
    private findConstructorStart(document:vscode.TextDocument, position:vscode.Position): vscode.Position{
        for (var lineNo = position.line; lineNo > position.line-5; lineNo--) {
            var line = document.lineAt(lineNo);
            if(line.isEmptyOrWhitespace){
                return new vscode.Position(lineNo,0);
            }
        }
        
        return new vscode.Position(position.line,0);
    }
}

interface InitializeFieldFromConstructor {
    document: vscode.TextDocument,    
    type:string,
    name: string,
    privateDeclaration: string,
    memberInitialization:string,
    constructorBodyStart: vscode.Position,
    constructorStart: vscode.Position,    
}