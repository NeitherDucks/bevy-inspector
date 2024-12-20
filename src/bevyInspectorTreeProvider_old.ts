import * as vscode from 'vscode';
import axios from 'axios';

export type BevyObject = BevyEntity | BevyComponent | BevyComponentError;

type BevyQueryResponse = {
	entity: number,
	components: [],
	has?: {},
}

type BevyGetComponentResponse = {
    components: [],
    errors: {},
}

export class BevyInspectorProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    getTreeItem(element: BevyEntity): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: BevyObject | undefined): vscode.ProviderResult<vscode.TreeItem[]> {
        if (element) {
            // get component list for entity
            if (element instanceof BevyEntity) {
                return this.bevy_get_entity_components("http://127.0.0.1", "15702", element.entity_id);
            } else if (element instanceof BevyComponent ) {
                return this.bevy_get_component_values("http://127.0.0.1", "15702", element.entity_id, element.component_path);
                // return Promise.resolve([]);
            }
        } else {
            // get entity list
            return this.bevy_list_entities("http://127.0.0.1", "15702");
        };

        return Promise.resolve([]);
    }

    private async bevy_list_entities(url: string, port: string): Promise<vscode.TreeItem[]> {
        const body = {
            "jsonrpc": "2.0",
            "method": "bevy/query",
            "id": 0,
            "params": {
                "data": {
                }
            }
        };
    
        try {
            const response = await axios.post(url + ":" + port, body);
    
            return (response.data.result as BevyQueryResponse[]).map(entity => new BevyEntity(entity.entity));
    
        } catch (error: any) {
            console.log(error);

            return Promise.resolve([]);
        }
    }

    private async bevy_get_entity_components(url: string, port: string, entity: number): Promise<vscode.TreeItem[]> {
        const body = {
            "jsonrpc": "2.0",
            "method": "bevy/list",
            "id": entity,
            "params": {
                "entity": entity,
            },
        };

        try {
            const response = await axios.post(url + ":" + port, body);
    
            return (response.data.result as string[]).map(component => new BevyComponent(component, entity));
        } catch (error: any) {
            console.log(error);

            return Promise.resolve([]);
        }
    }

    private async bevy_get_component_values(url: string, port: string, entity: number, component: string): Promise<vscode.TreeItem[]> {
        const body = {
            "jsonrpc": "2.0",
            "method": "bevy/get",
            "id": entity,
            "params": {
                "entity": entity,
                "components": [ component ],
            },
        };

        try {
            const response = await axios.post(url + ":" + port, body);

            console.log(response.data.result);

            const result = response.data.result as BevyGetComponentResponse;
            if (Object.keys(result.errors).length > 0) {
                return Promise.resolve([new BevyComponentError()]);
            }
    
            // TODO: handle components values
        } catch (error: any) {
            console.log(error);

            return Promise.resolve([]);
        }

        return Promise.resolve([]);
    }
}

export class BevyEntity extends vscode.TreeItem {
    constructor(
        public readonly entity_id: number,
    ) {
        super(`${entity_id}`, vscode.TreeItemCollapsibleState.Collapsed);

        this.tooltip = `${entity_id}`;
    }
}

export class BevyComponent extends vscode.TreeItem {
    name: string;

    constructor(
        public readonly component_path: string,
        public readonly entity_id: number,
    ) {
        const name: string = component_path.split("<")[0].split("::").at(-1) ?? "";
        super(name, vscode.TreeItemCollapsibleState.Collapsed);
        this.name = name;

        this.tooltip = component_path;
        this.description = component_path;
    }
}

export class BevyComponentError extends vscode.TreeItem {
    constructor () {
        super("Component is either not registered, or not reflected.");
    }
}

export class BevyComponentParmString extends vscode.TreeItem {
    constructor (label: string) {
        super(label);
    }
}