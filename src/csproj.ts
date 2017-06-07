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

import * as vscode from 'vscode'
import * as fs from 'mz/fs';
import * as path from 'path'

import { Csproj, XML } from './types'

const etree = require('elementtree')
const stripBom = require('strip-bom')

export class NoCsprojError extends Error { }

let _cacheXml: { [path: string]: XML } = Object.create(null)

export async function getPath(fileDir: string, walkUp = true): Promise<string> {
    if (!path.isAbsolute(fileDir))
        fileDir = path.resolve(fileDir)

    const files = await fs.readdir(fileDir)
    const csproj = files.find(file => file.endsWith('.csproj'))
    if (csproj)
        return path.resolve(fileDir, csproj)
    if (walkUp) {
        const parent = path.resolve(fileDir, '..')
        if (parent === fileDir)
            throw new NoCsprojError('Reached fs root, no csproj found')
        return getPath(parent)
    }
    throw new NoCsprojError(`No csproj found in current directory: ${fileDir}`)
}

export function hasFile(csproj: Csproj, filePath: string) {
    const filePathRel = relativeTo(csproj, filePath)
    const project = csproj.xml.getroot()
    const match = project.find(`./ItemGroup/*[@Include='${filePathRel}']`)
    return !!match
}

export function relativeTo(csproj: Csproj, filePath: string) {
    return path.relative(path.dirname(csproj.fsPath), filePath)
        .replace(/\//g, '\\') // use Windows style paths for consistency
}

export function getRootNamespace(csproj: Csproj) {
    const root = csproj.xml.getroot();

    return csproj.xml.getroot().findtext('./PropertyGroup/RootNamespace/');
}


/*
export function addFile(csproj: Csproj, filePath: string, itemType: string) {
    const itemGroups = csproj.xml.getroot().findall('./ItemGroup')
    const itemGroup = itemGroups.length
        ? itemGroups[itemGroups.length - 1]
        : etree.SubElement(csproj.xml.getroot(), 'ItemGroup')
    const itemElement = etree.SubElement(itemGroup, itemType)
    itemElement.set('Include', relativeTo(csproj, filePath))
}
 
export function removeFile(csproj: Csproj, filePath: string, directory = false): boolean {
    const root = csproj.xml.getroot()
    const filePathRel = relativeTo(csproj, filePath)
    const itemGroups = root.findall('./ItemGroup')
    const found = itemGroups.some(itemGroup => {
        const elements = directory
            ? itemGroup.findall(`./*[@Include]`).filter(element => element.attrib['Include'].startsWith(filePathRel))
            : itemGroup.findall(`./*[@Include='${filePathRel}']`)
        for (const element of elements) {
            itemGroup.remove(element)
        }
        return elements.length > 0
    })
    return found
}*/

async function readFile(path: string): Promise<string> {
    return stripBom(await fs.readFile(path, 'utf8'))
}

export async function persist(csproj: Csproj, indent = 2) {
    const xmlString = csproj.xml.write({ indent })

    // Add byte order mark.
    const xmlFinal = ('\ufeff' + xmlString)
        .replace(/\n/g, '\r\n') // use CRLF
        .replace(/\r?\n$/, '') // no newline at end of file

    await fs.writeFile(csproj.fsPath, xmlFinal)

    // Ensure that that cached XML is up-to-date
    _cacheXml[csproj.fsPath] = csproj.xml
}

export async function forFile(filePath: string): Promise<Csproj> {
    const fsPath = await getPath(path.dirname(filePath))
    const name = path.basename(fsPath)
    const xml = await load(fsPath)
    return { fsPath, name, xml }
}

export function ensureValid(csproj: Csproj) {
    return Object.assign({}, csproj, {
        xml: _cacheXml[csproj.fsPath]
    })
}

async function load(csprojPath: string) {
    if (!(csprojPath in _cacheXml)) {
        const csprojContent = await readFile(csprojPath)
        _cacheXml[csprojPath] = <XML>etree.parse(csprojContent)
    }
    return _cacheXml[csprojPath]
}

let _doInvalidation = true

export function invalidate(filePath: string) {
    if (_doInvalidation)
        delete _cacheXml[filePath]
}

export function invalidateAll() {
    _cacheXml = Object.create(null)
}