import {
	Uri,
	ExtensionContext,
	languages,
	commands,
	Disposable,
	workspace,
	window,
	ExtensionMode,
} from 'vscode';
import { CodelensProvider } from './vscodeAPI/CodelensProvider';
import { SideBarPanel } from "./panels/SideBarPanel";
import { ParseTask } from './workflows/ParseTask';
import { TreeDataProvider } from './panels/TreePanel';
import { ChatSideBarPanel } from './panels/ChatSideBarPanel';
import 'dotenv/config'
import { SettingDocument } from './panels/SettingDocument';

let disposables: Disposable[] = [];

export function activate(context: ExtensionContext) {

	/* ------------------ Open jfreechart project in workspace ------------------ */
	// TODO: Remove this only for development 
	if(context.extensionMode === ExtensionMode.Development || context.extensionMode === ExtensionMode.Test) {
		let uri = Uri.file("D:/Code/Code/ChatUniTest/jfreechart");
		commands.executeCommand('vscode.openFolder', uri);
	}

	if (workspace.workspaceFolders === undefined) {
		// no workspace is open
		return;
	} else if (!context.storageUri && context.storageUri === undefined) {
		// stroageUri is not defined
		return;
	}

	/* ----------------------------- webui provider ----------------------------- */
	// TODO: rm context.extionPath only used to get assests/tree-sitter-java.wasm
	const parseTask: ParseTask = new ParseTask("temp", context.storageUri, context.extensionPath);
	const sidePanel = new SideBarPanel(context.extensionUri, parseTask);
	context.subscriptions.push(
		window.registerWebviewViewProvider("myextension-sidebar", sidePanel,
		{
			webviewOptions: {
				retainContextWhenHidden: true,
			},
		}
		)
	);

	/* ----------------------------- chat side panel ----------------------------- */
	// const chatSidePanel = new ChatSideBarPanel(context.extensionUri);
	// context.subscriptions.push(
	// 	window.registerWebviewViewProvider("myextension-sidebar2", chatSidePanel, {
	// 		webviewOptions: {
	// 			retainContextWhenHidden: true,
	// 		},
	// 	})
	// );

	/* ----------------------------- tree view provider ----------------------------- */
	const treeData = new TreeDataProvider();
	context.subscriptions.push(
		window.registerTreeDataProvider(
			'myextension-treeview', treeData
		)
	);

	/* ----------------------------- code lens provider ----------------------------- */
	const codelensProvider = new CodelensProvider(context.storageUri);
	context.subscriptions.push(
		languages.registerCodeLensProvider("*", codelensProvider)
	);

	/* ----------------------------- register content provider ----------------------------- */
	const myProvider = new SettingDocument(context.globalState, context.secrets)
	myProvider.initialize().then(() => {
		context.subscriptions.push(workspace.registerTextDocumentContentProvider('settings', myProvider));
	});



	/* ----------------------------- register commands ----------------------------- */
	context.subscriptions.push(
		commands.registerCommand('autogen.settings', async () => {
			let uri = Uri.parse('settings:' + 'settings.json');
			let doc = await workspace.openTextDocument(uri);
			await window.showTextDocument(doc, { preview: false });
	}));

	context.subscriptions.push(
		commands.registerCommand('autogen.api-key', async () => {
			const input = await window.showInputBox();
			if (input && input.length > 3) {
				await context.secrets.store("autoTestGen.apiKey", input);
				window
				.showInformationMessage(
				  "API Key saved. Please reload the window to apply the changes.",
				  { title: "API Key saved" }
				)
				.then((item) => {
				  if (item) {
					commands.executeCommand("workbench.action.reloadWindow");
				  }
				});
			}else{
				window.showErrorMessage("Invalid input");
			}
	}));

	context.subscriptions.push(
		// TODO: replace with proper name command
		commands.registerCommand("codelens-sample.codelensAction", (...args) => {
		window.showInformationMessage(`Generate Start line=${args[0]} End Line = ${args[1]} `);
	}));

	context.subscriptions.push(commands.registerCommand('autoTestGen.sendToWebView', (data) => {
		sidePanel.sendCodeLensData(data);
	}));
	

	/* ----------------------------- register events ----------------------------- */
	context.subscriptions.push(
		// updates the parsed class file on save
		workspace.onDidSaveTextDocument((event) => {
			if (event.languageId === 'java') {
				parseTask.updateParsedClassFile(event.fileName);
			}
	}));

}

export function deactivate() {
	disposables.forEach((d) => d.dispose());
}

