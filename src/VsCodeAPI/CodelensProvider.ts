import { debug } from 'console';
import {CodeLensProvider, CodeLens, EventEmitter, Event, workspace, TextDocument, CancellationToken, Position, ExtensionContext, window, Range} from 'vscode';
import { ParsedClassType } from '../types/ParsedClassType';
import * as fs from 'fs';
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
	
	constructor(private readonly _extensionPath: string) {
		workspace.onDidChangeTextDocument((_) => {
			this._onDidChangeCodeLenses.fire();
		});
	}

	private openParsedClassFile(): ParsedClassType {
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

		const filePath: string = path.join(this._extensionPath, 'temp', workspace.workspaceFolders[0].name , 'main' , path.basename(window.activeTextEditor.document.fileName) + '.json');
		if (!fs.existsSync(filePath)) {
			return parsedClass;
		}
		const fileContent = fs.readFileSync(filePath, 'utf8');
		const parsedContent = JSON.parse(fileContent);
		return parsedContent;
	}

	// @ts-ignore
	public provideCodeLenses(document: TextDocument, token: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {

		if (workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
			let parsedClass: ParsedClassType = this.openParsedClassFile();
			this.codeLenses = [];

			if (!parsedClass.methods) {
				return [];				
			}
			parsedClass.methods?.forEach(element => {
				if (!element || !element.star_line || !element.end_line || !element.is_constructor) {
					return;
				}
				const posX = new Position(element.star_line, 0);
				const posY = new Position(element.end_line, 0);
				const range: Range = new Range(posX, posY);
				if (range){
					this.codeLenses.push(new CodeLens(range));
				}	
			});

			return this.codeLenses;
		}
		return [];
	}

	// @ts-ignore
	public resolveCodeLens(codeLens: CodeLens, token: CancellationToken) {
		if (workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
			codeLens.command = {
				title: "Generate Test Case",
				tooltip: "This will generate a test case for the method",
				command: "codelens-sample.codelensAction",
				arguments: [codeLens.range.start.line , codeLens.range.end.line]
			};
			return codeLens;
		}
		return null;
	}
}
