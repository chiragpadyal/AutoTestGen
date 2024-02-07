import { ExtensionContext, languages, commands, Disposable, workspace, window, CallHierarchyOutgoingCall, CallHierarchyItem, Range, Position } from 'vscode';
import { CodelensProvider } from './VsCodeAPI/CodelensProvider';
import * as vscode from 'vscode';
import { showInputBox } from './VsCodeAPI/BasicInputs';
import { SideBarPanel } from "./panels/SideBarPanel";
import { ParseTask } from './Workflows/ParseTask';
import { TreeDataProvider, TreeItem } from './panels/TreePanel';
import { ChatSideBarPanel } from './panels/ChatSideBarPanel';
import 'dotenv/config'

let disposables: Disposable[] = [];

export function activate(context: ExtensionContext) {

	let uri = vscode.Uri.file("D:/Code/Code/ChatUniTest/jfreechart");
	commands.executeCommand('vscode.openFolder', uri);

	const codelensProvider = new CodelensProvider(context.extensionPath);
	const myScheme = 'cowsay';


	const parseTask: ParseTask = new ParseTask("temp", context.extensionPath);
	const sidePanel = new SideBarPanel(context.extensionUri, context.extensionPath, parseTask);
	const chatSidePanel = new ChatSideBarPanel(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("myextension-sidebar", sidePanel)
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("myextension-sidebar2", chatSidePanel)
	);

		context.subscriptions.push(
			vscode.window.registerTreeDataProvider(
			  'myextension-treeview', new TreeDataProvider()
			)
		  )


	// @ts-ignore
	languages.registerCodeLensProvider("*", codelensProvider);

	const myProvider = new class implements vscode.TextDocumentContentProvider {

		// emitter and its event
		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;

		provideTextDocumentContent(uri: vscode.Uri): string {
			// simply invoke cowsay, use uri-path as text
			// return cowsay.say({ text: uri.path });
			return `
			{
				"apiKey": "",
			}
			`
		}
	};
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider));

	vscode.commands.registerCommand('autogen.settings', async () => {
		  let uri = vscode.Uri.parse('cowsay:' + 'settings.json');
		  let doc = await vscode.workspace.openTextDocument(uri
			); // calls back into the provider
		  await vscode.window.showTextDocument(doc, { preview: false });
	  });

	  
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

