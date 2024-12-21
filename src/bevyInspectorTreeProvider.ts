import * as vscode from 'vscode';
import { BevyComponent, BevyComponentParm, BevyEntity, BevyRemote, BevyRemoteObject } from './bevyRemote';

export class BevyInspectorProvider implements vscode.TreeDataProvider<BevyRemoteObject> {
    remote: BevyRemote;
    private _onDidChangeTreeData: vscode.EventEmitter<void | BevyRemoteObject | BevyRemoteObject[] | null | undefined> = new vscode.EventEmitter<void | BevyRemoteObject | BevyRemoteObject[] | null | undefined>();
    readonly onDidChangeTreeData: vscode.Event<void | BevyRemoteObject | BevyRemoteObject[] | null | undefined> | undefined = this._onDidChangeTreeData.event;

    constructor(
        remote: BevyRemote,
    ) {
        this.remote = remote;
    }

    getTreeItem(element: BevyRemoteObject): vscode.TreeItem {
        return new BevyTreeObject(element);
    }

    getChildren(element?: BevyRemoteObject | undefined): vscode.ProviderResult<BevyRemoteObject[]> {
        if(element) {
            if (element instanceof BevyEntity) {
                return this.remote.get_components_of_entity(element.id);
            } else if (element instanceof BevyComponent) {
                if (element.name === "Children") {
                    return this.remote.get_children_of(element.entity);
                } else if (element.name === "Parent") {
                    return this.remote.get_parent_of(element.entity);
                } else {
                    // return element.parms;
                    return this.remote.get_parms_of_entity_component(element.entity, element.path);
                }
            } else if (element instanceof BevyComponentParm) {
                return element.subparms;
            }
        } else {
            return this.remote.get_all_entities();
        }

        return Promise.resolve([]);
    }

    refresh(element?: void | BevyRemoteObject | BevyRemoteObject[] | null | undefined) {
        this._onDidChangeTreeData.fire(element);
    }
}

export class BevyTreeObject extends vscode.TreeItem {
    readonly entity?: BevyEntity;
    readonly component?: BevyComponent;
    readonly parm?: BevyComponentParm;

    constructor(
        object: BevyRemoteObject,
    ) {
        super(object.name, object.collapsible ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);

        this.description = object.description;
        this.tooltip = object.tooltip;
    }
}