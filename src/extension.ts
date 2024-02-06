import { ExtensionContext, languages, commands, Disposable, workspace, window, CallHierarchyOutgoingCall, CallHierarchyItem, Range, Position } from 'vscode';
import { CodelensProvider } from './VsCodeAPI/CodelensProvider';
import * as vscode from 'vscode';
import { showInputBox } from './VsCodeAPI/BasicInputs';
import { SideBarPanel } from "./panels/SideBarPanel";
import { ParseTask } from './Workflows/ParseTask';
import { TreeDataProvider, TreeItem } from './panels/TreePanel';

let disposables: Disposable[] = [];

export function activate(context: ExtensionContext) {

	let uri = vscode.Uri.file("D:/Code/Code/ChatUniTest/jfreechart");
	commands.executeCommand('vscode.openFolder', uri);

	const codelensProvider = new CodelensProvider(context.extensionPath);


	const parseTask: ParseTask = new ParseTask("temp", context.extensionPath);
	const explorer = new SideBarPanel(context.extensionUri, context.extensionPath, parseTask);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("myextension-sidebar", explorer)
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("myextension-sidebar2", explorer)
	);

		context.subscriptions.push(
			vscode.window.registerTreeDataProvider(
			  'myextension-treeview', new TreeDataProvider()
			)
		  )


	// @ts-ignore
	languages.registerCodeLensProvider("*", codelensProvider);

	commands.registerCommand("codelens-sample.enableCodeLens", () => {
		workspace.getConfiguration("codelens-sample").update("enableCodeLens", true, true);
	});

	commands.registerCommand("codelens-sample.disableCodeLens", () => {
		workspace.getConfiguration("codelens-sample").update("enableCodeLens", false, true);
	});

	commands.registerCommand("codelens-sample.codelensAction", (...args) => {
		window.showInformationMessage(`Generate Start line=${args[0]} End Line = ${args[1]} `);
		showInputBox();
	});

	workspace.onDidSaveTextDocument((event) => {
		if (event.languageId === 'java') {
			parseTask.updateParsedClassFile(event.fileName);
		}
	});	
}

export function deactivate() {
	disposables.forEach((d) => d.dispose());
}

