// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios';
import { BevyInspectorProvider } from './bevyInspectorTreeProvider';
import { BevyRemote, BevyRemoteObject } from './bevyRemote';

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

	const remote = new BevyRemote(url, port);
	const bevyInspector = new BevyInspectorProvider(remote);

	remote.onUpdate = () => {
		bevyInspector.refresh();
	};

	const tree = vscode.window.createTreeView('bevyInspector', new BevyInspectorTreeViewOptions(bevyInspector));

}

// This method is called when your extension is deactivated
export function deactivate() {}

class BevyInspectorTreeViewOptions implements vscode.TreeViewOptions<BevyRemoteObject> {
	treeDataProvider: BevyInspectorProvider;

	constructor(
		public readonly provider: BevyInspectorProvider,
	) {
		this.treeDataProvider = provider;
	}
}
