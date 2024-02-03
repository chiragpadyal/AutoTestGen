import { ExtensionContext, languages, commands, Disposable, workspace, window, CallHierarchyOutgoingCall, CallHierarchyItem, Range, Position } from 'vscode';
import { CodelensProvider } from './VsCodeAPI/CodelensProvider';
import { SidebarProvider } from './VsCodeAPI/SidebarProvider';
import * as vscode from 'vscode';
import { showInputBox } from './VsCodeAPI/BasicInputs';

let disposables: Disposable[] = [];

export function activate(context: ExtensionContext) {
	const codelensProvider = new CodelensProvider();
	
	// Register the Sidebar Panel
	const sidebarProvider = new SidebarProvider(context.extensionUri);
	
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"myextension-sidebar",
			sidebarProvider
		)
	);

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
}
