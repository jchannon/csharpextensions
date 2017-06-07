// MIT License

// Copyright (c) 2017 Lucas Azzola

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// https://github.com/azz/vscode-csproj

import { Memento } from 'vscode'

export interface Csproj {
    fsPath: string
    name: string
    xml: XML
}

export interface CsprojAndFile {
    csproj: Csproj
    filePath: string
}

export interface ActionArgs extends CsprojAndFile {
    fileName: string
    bulkMode: boolean
    globalState: Memento
}

export type ItemType = string | { [extension: string]: string }

export interface XMLElement {
    find(xpath: string): XMLElement
    findall(xpath: string): XMLElement[]
    findtext(xpath: string): string;
    remove(child: XMLElement): void

    attrib: { [attribute: string]: string }
}

export interface XML {
    getroot(): XMLElement

    write(opts: any): string
}