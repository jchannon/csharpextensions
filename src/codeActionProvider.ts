'use strict'
import *  as vscode from 'vscode';

export default class CodeActionProvider implements vscode.CodeActionProvider{
    private _commandIds = {
        ctorFromReadonlyFields: 'csharpextensions.ctorFromReadonlyFields',
        initializeMemberFromCtor: 'csharpextensions.initializeMemberFromCtor'
    };
    
    constructor() {         
        vscode.commands.registerCommand(this._commandIds.initializeMemberFromCtor, this.initializeMemberFromCtor, this);
        vscode.commands.registerCommand(this._commandIds.ctorFromReadonlyFields, this.executeCtorFromReadonlyFields, this);
    }    

    
     public provideCodeActions(document:vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken) : vscode.Command[] {
        var commands = [];
        
        var initalizeFromCtorCommand = this.getInitializeFromCtorCommand(document,range,context,token);
        if(initalizeFromCtorCommand)
            commands.push(initalizeFromCtorCommand)
        
        var ctorPCommand = this.getCtorpCommand(document, range, context, token);
        if(ctorPCommand)
            commands.push(ctorPCommand);

        return commands;  
    }

    private removePrivateMemberPrefix(memberName:string):string {
        var privateMemberPrefix = vscode.workspace.getConfiguration().get('csharpextensions.privateMemberPrefix', '');
        if(memberName.indexOf(privateMemberPrefix) === 0){
            return memberName.substr(privateMemberPrefix.length);
        }
        return memberName;
    }

    private executeCtorFromReadonlyFields(args:CtorFromReadonlyFieldsArguments) {        
        var tabSize = vscode.workspace.getConfiguration().get('editor.tabSize', 4);
        let ctorParams = [];
        
        if(!args.readonlyFields)
            return;
        
        args.readonlyFields.forEach((p)=>{
            ctorParams.push(`${p.type} ${this.removePrivateMemberPrefix(p.name)}`)
        });

        let lastFieldLine = args.readonlyFields.sort((a,b)=>{
            return b.lineNumber-a.lineNumber
        })[0].lineNumber;
        
        let assignments = [];
        args.readonlyFields.forEach((p)=>{
            assignments.push(`${Array(tabSize*1).join(' ')} this.${p.name} = ${this.removePrivateMemberPrefix(p.name)};
            `);
        });
        

        var ctorStatement = `${Array(tabSize*2).join(' ')} ${args.classDefinition.modifier} ${args.classDefinition.className}(${ctorParams.join(', ')}) 
        {
        ${assignments.join('')}   
        }
        `;

        let edit = new vscode.WorkspaceEdit();
        var edits = [];

        //var pos = new vscode.Position(args.classDefinition.startLine+2,0);
        var pos = new vscode.Position(lastFieldLine+1,0);
        let range = new vscode.Range(pos,pos);
        let ctorEdit = new vscode.TextEdit(range, ctorStatement);
        edits.push(ctorEdit)
        edit.set(args.document.uri, edits);
        var reFormatAfterChange = vscode.workspace.getConfiguration().get('csharpextensions.reFormatAfterChange', true);
        var applyPromise = vscode.workspace.applyEdit(edit)
        if(reFormatAfterChange){
            applyPromise.then(()=>{
                vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', args.document.uri).then((formattingEdits:vscode.TextEdit[])=>{
                    var formatEdit = new vscode.WorkspaceEdit();
                    formatEdit.set(args.document.uri,formattingEdits);
                    vscode.workspace.applyEdit(formatEdit);    
                });
            })
        }
    }

    private getCtorpCommand(document:vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken) : vscode.Command {
        const editor = vscode.window.activeTextEditor;
        const position = editor.selection.active;

        var withinClass = this.findClassFromLine(document, position.line);
        if(!withinClass)
            return null;

        var fields = [];
        var temp;        
        document.lineCount
        var lineNo = 0;
        while(lineNo < document.lineCount){
            var readonlyRegex = new RegExp(/(private|protected)\sreadonly\s(\w+)\s(\w+);/g);        
            var textLine = document.lineAt(lineNo);
            var match = readonlyRegex.exec(textLine.text);
                        
            if(match){
                var clazz = this.findClassFromLine(document,lineNo);
                if(clazz.className === withinClass.className) {                
                    var field :CSharpReadonlyFieldDefinition = {
                        lineNumber: lineNo,
                        class: clazz,
                        modifier: match[1],
                        type: match[2],
                        name: match[3],
                        statement: match[0]
                    }

                    fields.push(field);
                }
            }
            lineNo+=1;
        }

        /*
        while((temp = readonlyRegex.exec(document.getText()))!= null){
            var field : CSharpReadonlyFieldDefinition = {
                modifier: temp[1],
                type: temp[2],
                name: temp[3],
                statement: temp[0]
            };

            fields.push(field);
        }
        */

        if(!fields.length)
            return null;

        var classDefinition = this.findClassFromLine(document, position.line);
        if(!classDefinition)
            return;

        var parameter : CtorFromReadonlyFieldsArguments = {
            readonlyFields: fields,
            classDefinition: classDefinition,
            document: document
        };

        let cmd: vscode.Command = {
            title: "Initialize ctor from readonly fields...",
            command: this._commandIds.ctorFromReadonlyFields,
            arguments: [parameter]
        };

        return cmd;
    }

    private findClassFromLine(document:vscode.TextDocument, lineNo:number) : CSharpClassDefinition {
        var classRegex = new RegExp(/(private|internal|public|protected)\s?(static)?\sclass\s(\w*)/g);        
        while(lineNo > 0){
            var line = document.lineAt(lineNo);
            let match;
            if((match = classRegex.exec(line.text))){                
                return {
                    startLine: lineNo,
                    endLine: -1,
                    className: match[3],
                    modifier: match[1],
                    statement: match[0]
                };
            }
            lineNo -=1;
        }
        return null;
    }

    private initializeMemberFromCtor(args:InitializeFieldFromConstructor) {
        let edit = new vscode.WorkspaceEdit();
        
        var bodyStartRange = new vscode.Range(args.constructorBodyStart, args.constructorBodyStart)
        var declarationRange = new vscode.Range(args.constructorStart, args.constructorStart);        
        
        let declarationEdit = new vscode.TextEdit(declarationRange, args.privateDeclaration);
        let memberInitEdit = new vscode.TextEdit(bodyStartRange, args.memberInitialization);                        

        var edits = [];
        if(args.document.getText().indexOf(args.privateDeclaration.trim()) == -1){
            edits.push(declarationEdit);
        }
        
        if(args.document.getText().indexOf(args.memberInitialization.trim())==  -1){
            edits.push(memberInitEdit);
        }
        
        edit.set(args.document.uri, edits);
        
        var reFormatAfterChange = vscode.workspace.getConfiguration().get('csharpextensions.reFormatAfterChange', true);
        var applyPromise = vscode.workspace.applyEdit(edit);

        if(reFormatAfterChange){
            applyPromise.then(()=>{
                vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', args.document.uri).then((formattingEdits:vscode.TextEdit[])=>{
                    var formatEdit = new vscode.WorkspaceEdit();
                    formatEdit.set(args.document.uri,formattingEdits);
                    vscode.workspace.applyEdit(formatEdit);    
                });
            })
        }
    }

    private getInitializeFromCtorCommand(document:vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken):vscode.Command {
        const editor = vscode.window.activeTextEditor;        
        const position = editor.selection.active;
        var surrounding = document.getText(new vscode.Range(new vscode.Position(position.line-2,0),new vscode.Position(position.line+2,0)));
        let wordRange = editor.document.getWordRangeAtPosition(position);
        if(!wordRange)
            return null;

        var regex = new RegExp(/(public|private|protected)\s(.*)\(([\s\S]*?)\)/gi);
        var matches = regex.exec(surrounding);
        if(!matches)
            return null;

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
        
        var tabSize = vscode.workspace.getConfiguration().get('editor.tabSize', 4);
        var privateMemberPrefix = vscode.workspace.getConfiguration().get('csharpextensions.privateMemberPrefix', '');

        var parameter:InitializeFieldFromConstructor = {
            document: document,            
            type: parameterType,
            name: selectedName,
            privateDeclaration: `${Array(tabSize*2).join(' ')} private readonly ${parameterType} ${privateMemberPrefix}${selectedName};\r\n`,
            memberInitialization: `${Array(tabSize*3).join(' ')} this.${privateMemberPrefix}${selectedName} = ${selectedName};\r\n`,
            constructorBodyStart: this.findConstructorBodyStart(document,position),
            constructorStart: this.findConstructorStart(document,position)
        };        
                 
        let cmd: vscode.Command = {
            title: "Initialize field from parameter...",
            command: this._commandIds.initializeMemberFromCtor,
            arguments: [parameter]
        };

        return cmd;
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
interface CSharpClassDefinition {
    startLine: number,
    endLine: number,
    className: string,
    modifier: string,
    statement: string
}

interface CSharpReadonlyFieldDefinition{
    class: CSharpClassDefinition,
    modifier: string,
    type: string,
    name: string,
    statement: string,
    lineNumber: number            
}

interface CtorFromReadonlyFieldsArguments{
    document: vscode.TextDocument,    
    classDefinition: CSharpClassDefinition,
    readonlyFields: CSharpReadonlyFieldDefinition[]
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