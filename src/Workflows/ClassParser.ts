import * as fs from 'fs';
import * as path from 'path';
import {ParsedClassType, ParsedMethodType} from '../types/ParsedClassType';
import * as Parser from 'web-tree-sitter';
import { LogLevel, Logger } from '../utilities/logger';


export default class ClassParser {
    private content: string | null;
    private parser: Parser | undefined;
    private logger: Logger;

    constructor() {
        this.logger = Logger.getInstance();
        this.content = null;
    }
    
    async initializeParser(_extensionPath: string){
        await Parser.init();
        this.parser = new Parser();
        const absolutePath = path.join(_extensionPath, "assets" ,  'tree-sitter-java.wasm');
        const wasmPath = path.relative(process.cwd(), absolutePath);
        const language = await Parser.Language.load(wasmPath);
        this.parser.setLanguage(language);
        this.logger.log(LogLevel.INFO, 'ClassParser', `Parser path: ${wasmPath}`);
    }


    parseJavaFile(file: string): ParsedClassType {
        const classData: ParsedClassType = {};
        const methods: ParsedMethodType[] = [];
        const imports: string[] = [];
        const content = fs.readFileSync(file, 'utf8');
        this.content = content;
        
        if (!this.parser) {
            throw new Error('Parser not initialized');
        }
        const tree = this.parser.parse(content);
        const rootNode = tree.rootNode;

        for (const node of rootNode.children) {

            if (node.type === 'class_declaration') {
                for (const child of node.children) {
                    if (child.type === 'class_body') {
                        for (const method of child.children) {
                            if (!this.isMethodBodyEmpty(method)) {
                                if (method.type === 'method_declaration') {
                                    methods.push({
                                        method_name: this.getFunctionName(method, content),
                                        star_line: method.startPosition.row + 1,
                                        end_line: method.endPosition.row + 1,
                                        source_code: method.text.slice(1, -1),
                                        is_constructor: false,
                                    });
                                } else if (method.type === 'constructor_declaration') {
                                    methods.push({
                                        method_name: 'constructor',
                                        star_line: method.startPosition.row + 1,
                                        end_line: method.endPosition.row + 1,
                                        source_code: method.text.slice(1, -1),
                                        is_constructor: true,
                                    });
                                } 
                            } 
                        }
                    } else if(child.type == 'identifier'){
                        classData.class_name = this.matchFromSpan(child, content).replace(/^\(:/, '');
                    } 
                }
            } else if(node.type == 'import_declaration'){
                imports.push(node.text);
            } else if (node.type == 'package_declaration') {
                classData.package = node.text;
            }
        }
        classData.methods = methods;
        classData.imports = imports;
        classData.class_path = file;
        classData.project_name = path.basename(file);
        return classData;
    }


    getFunctionName(functionNode: any, blob: string): string {
        const declarators: any[] = [];
        this.traverseType(functionNode, declarators, `${functionNode.type.split('_')[0]}_declaration`);
        for (const n of declarators[0].children) {
            if (n.type === 'identifier') {
                return this.matchFromSpan(n, blob).replace('(', '').trim();
            }
        }
        return '';
    }

    matchFromSpan(node: Parser.SyntaxNode, blob: string): string {
        const lines = blob.split('\n');
        const lineStart = node.startPosition.row;
        const lineEnd = node.endPosition.row;
        const charStart = node.startPosition.column;
        const charEnd = node.endPosition.column;
        if (lineStart !== lineEnd) {
            return [
                lines[lineStart].slice(charStart),
                ...lines.slice(lineStart + 1, lineEnd),
                lines[lineEnd].slice(0, charEnd)
            ].join('\n');
        } else {
            return lines[lineStart].slice(charStart, charEnd);
        }
    }

    traverseType(node: Parser.SyntaxNode, results: any[], kind: string): void {
        if (node.type === kind) {
            results.push(node);
        }
        if (!node.children) {
            return;
        }
        for (const n of node.children) {
            this.traverseType(n, results, kind);
        }
    }

    

    isMethodBodyEmpty(node: Parser.SyntaxNode): boolean {
        for (const c of node.children) {
            if (c.type === 'method_body' || c.type === 'constructor_body') {
                if (c.startPosition.row === c.endPosition.row) {
                    return true;
                }
            }
        }
        return false;
    }


}