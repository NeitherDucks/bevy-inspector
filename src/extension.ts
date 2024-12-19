// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios';
import { BevyInspectorProvider, BevyObject } from './bevyInspector';

type BevyQueryResponse = {
	entity: number,
	components: [],
	has?: {},
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const url = "http://127.0.0.1";
	const port = "15702";

	const bevyInspector = new BevyInspectorProvider();
	vscode.window.registerTreeDataProvider('bevyInspector', bevyInspector);
	vscode.commands.registerCommand('bevyInspector.addEntry', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	vscode.commands.registerCommand('bevyInspector.editEntry', (node: BevyObject) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));
	vscode.commands.registerCommand('bevyInspector.deleteEntry', (node: BevyObject) => vscode.window.showInformationMessage(`Successfully called delet entry on ${node.label}.`));

}

// This method is called when your extension is deactivated
export function deactivate() {}