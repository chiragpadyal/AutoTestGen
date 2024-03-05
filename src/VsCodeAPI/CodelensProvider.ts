import {CodeLensProvider, CodeLens, EventEmitter, Event, workspace, TextDocument, CancellationToken, Position, ExtensionContext, window, Range, Uri} from 'vscode';
import { ParsedClassType } from '../types/ParsedClassType';
import * as path from 'path';
import { LogLevel, Logger } from '../utilities/logger';


/**
 * CodelensProvider
 */
export class CodelensProvider implements CodeLensProvider {

	private codeLenses: CodeLens[] = [];
	private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
	public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;
	private logger: Logger = Logger.getInstance();
	

	/**
	 * Initialize CodelensProvider with the vscode storage URL
	 * @param {Uri} vsStorageURL The URL for vscode storage
	 */
	constructor(private readonly vsStorageURL: Uri) {
		workspace.onDidChangeTextDocument((_) => {
			this._onDidChangeCodeLenses.fire();
		});
	}

	private async openParsedClassFile(): Promise<ParsedClassType> {
		const parsedClass: ParsedClassType = {};
		if (!window.activeTextEditor || !workspace.workspaceFolders) {
			return parsedClass;
		} else if(window.activeTextEditor.document.languageId !== 'java') {
			return parsedClass;
		} else if (window.activeTextEditor.document.isUntitled) {
			return parsedClass;
		} else if (window.activeTextEditor.document.isDirty) {
			return parsedClass;
		} 

		// const filePath: string = path.join(this.vsStorageURL, 'temp', workspace.workspaceFolders[0].name , 'main' , path.basename(window.activeTextEditor.document.fileName) + '.json');
		const filePath: Uri = Uri.joinPath(this.vsStorageURL, 'temp', workspace.workspaceFolders[0].name , 'main' , path.basename(window.activeTextEditor.document.fileName) + '.json');
		let parsedContent = {};
		try{
			const fileContent = await workspace.fs.readFile(filePath)
			const readStr = Buffer.from(fileContent).toString('utf8');
			parsedContent = JSON.parse(readStr);
			return parsedContent;
		} catch (err) {
			this.logger.log(LogLevel.ERROR, 'CodelensProvider', `Error opening file: ${err}`);
		}
		return parsedContent;
	}

	// @ts-ignore
	public async provideCodeLenses(document: TextDocument, token: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {

		if (workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
			let parsedClass: ParsedClassType = await this.openParsedClassFile();
			this.codeLenses = [];

			if (!parsedClass.methods) {
				return [];				
			}
			parsedClass.methods?.forEach(element => {
				if (!element || !element.star_line || !element.end_line || element.is_constructor) {
					return;
				}
				const posX = new Position(element.star_line, 0);
				const posY = new Position(element.end_line, 0);
				const range: Range = new Range(posX, posY);
				if (range){
					this.codeLenses.push(new CodeLens(range, {
						title: `Generate Test Case | ${element.number_of_NC}/${element.number_of_PC}`,
						tooltip: "This will generate a test case for the method",
						command: "autoTestGen.sendToWebView",
						arguments: [{
							"code": document.getText(range),
							"methodName": element.method_name,
							"range": [element.star_line, element.end_line],
							"packageName": document.getText().match(/package\s+([a-zA-Z0-9_.]+)\s*;/)?.[1] || '',
							"documentUri": document.uri
						}]
					}
						));
				}	
			});

			return this.codeLenses;
		}
		return [];
	}

	// public resolveCodeLens(codeLens: CodeLens, token: CancellationToken) {
	// 	const editor = window.activeTextEditor;
	// 	if (editor) {
	// 		const document = editor.document;
	// 		const code = document.getText(codeLens.range);
	// 		const packageName: string = document.getText().match(/package\s+([a-zA-Z0-9_.]+)\s*;/)?.[1] || '';
	// 		codeLens.command = {
	// 			title: "Generate Test Case",
	// 			tooltip: "This will generate a test case for the method",
	// 			command: "autoTestGen.sendToWebView",
	// 			arguments: [{
	// 				// code, [codeLens.range.start.line, codeLens.range.end.line], packageName , document.uri
	// 				"code": code,
	// 				"methodName": "",
	// 				"range": [codeLens.range.start.line, codeLens.range.end.line],
	// 				"packageName": packageName,
	// 				"documentUri": document.uri
	// 			}]
	// 		};
	// 	}
	// 	return codeLens;
	// }
}
