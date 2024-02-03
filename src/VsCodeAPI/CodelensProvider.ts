import { debug } from 'console';
import {CodeLensProvider, CodeLens, EventEmitter, Event, workspace, TextDocument, CancellationToken, Position} from 'vscode';

/**
 * CodelensProvider
 */
export class CodelensProvider implements CodeLensProvider {

	private codeLenses: CodeLens[] = [];
	private regex: RegExp;
	private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
	public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

	constructor() {
        this.regex = /(public|private|protected)?\s*(static|final)?\s*(\w+)\s+(\w+)\s*\((.*)\)\s*\{/gm;

		workspace.onDidChangeConfiguration((_) => {
			this._onDidChangeCodeLenses.fire();
		});
	}

	// @ts-ignore
	public provideCodeLenses(document: TextDocument, token: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {

		if (workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
			this.codeLenses = [];
			const regex = new RegExp(this.regex);
			const text = document.getText();
			let matches;
			while ((matches = regex.exec(text)) !== null) {
				const line = document.lineAt(document.positionAt(matches.index).line);
				const indexOf = line.text.indexOf(matches[0]);
				const position = new Position(line.lineNumber, indexOf);
				const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));
				if (range) {
					this.codeLenses.push(new CodeLens(range));
				}
			}
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
