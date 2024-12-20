import * as vscode from 'vscode';
import axios from 'axios';

export class BevyRemote {
    url: string;
    entities: Map<number, BevyEntity>;

    public onUpdate?: () => void;

    constructor(
        url: string,
        port: string,
    ) {
        this.url = `${url}:${port}`;
        this.entities = new Map();
        // this.load_all_entities();
    }

    private _onUpdate() {
        if (this.onUpdate) {
            this.onUpdate();
        }
    }

    create_entity(response: BevyQueryEntityResponse) {
        let entity = new BevyEntity(response);

        this.entities.set(response.entity, entity);

        // this._onUpdate();
    }

    create_component_of_entity(id: number, path: string) {
        this.entities.get(id)?.components.set(path, new BevyComponent(id, path));
        
        // this._onUpdate();
    }

    async get_all_entities() {
        await this.query_all_entities();

        return Array.from(this.entities.values()).filter(entity => !entity.has_parent());
    }

    get_children_of(entity: number) {
        return this.entities.get(entity)?.children?.map(child => this.entities.get(child)).filter(value => value !== undefined);
    }

    get_parent_of(entity: number) {
        if (this.entities.get(entity)?.parent) {
            const parent = this.entities.get(this.entities.get(entity)!.parent!);
            if (parent) {
                return [parent];
            }
        }
        
        return [];
    }

    private async query_all_entities() {
        const body = {
            "jsonrpc": "2.0",
            "method": "bevy/query",
            "id": 0,
            "params": {
                "data": {
                    "option": [
                        "bevy_hierarchy::components::parent::Parent", 
                        "bevy_hierarchy::components::children::Children",
                        "bevy_core::name::Name",
                    ]
                }
            }
        };

        try {
            const response = await axios.post(this.url, body);

            console.log(response.data.result);

            (response.data.result as BevyQueryEntityResponse[]).forEach(entity => {
                this.create_entity(entity);
                this.load_all_components_for_entity(entity.entity);
            });

        } catch (error: any) {
            console.log(error); // TODO: replace with OUTPUT
        }
    }

    async load_all_components_for_entity(id: number) {
        const body = {
            "jsonrpc": "2.0",
            "method": "bevy/list",
            "id": id,
            "params": {
                "entity": id,
            },
        };

        try {
            const response = await axios.post(this.url, body);

            (response.data.result as string[]).forEach(component => {
                this.create_component_of_entity(id, component);
            });

            return this.entities.get(id)?.get_component_list();
        } catch (error: any) {
            console.log(error); // TODO: replace with OUTPUT
        }
    }
}

export type BevyRemoteObject = BevyEntity | BevyComponent | BevyComponentParm;

export class BevyEntity {
    id: number;
    name: string;
    description?: string;
    tooltip?: string;
    collapsible: boolean = true;

    parent?: number;
    children?: number[];
    components: Map<string, BevyComponent>;

    constructor(
        entity: BevyQueryEntityResponse,
    ) {
        this.id = entity.entity;
        this.name = entity.components['bevy_core::name::Name']?.name ?? `${this.id}`;
        this.tooltip = entity.components['bevy_core::name::Name']?.name ? `${this.name} - ${this.id}` : `${this.id}`;

        this.children = entity.components['bevy_hierarchy::components::children::Children'];
        this.parent = entity.components['bevy_hierarchy::components::parent::Parent'];

        this.components = new Map();
    }

    get_component_list() {
        return Array.from(this.components.values());
    }

    has_parent(): boolean {
        return this.parent !== undefined;
    }
}

export class BevyComponent {
    entity: number;
    name: string;
    path: string;
    description?: string;
    tooltip?: string;
    collapsible: boolean = true;

    parms?: BevyComponentParm[];

    constructor(
        id: number,
        path: string,
    ) {
        this.entity = id;
        this.path = path;
        this.name = path.split('<')[0].split('::').at(-1) ?? path;

        this.tooltip = this.path;
    }
}

export class BevyComponentParm {
    name: string = "";
    description?: string;
    tooltip?: string;
    collapsible: boolean = false;
}

export class BevyComponentParmString {
    name: string = "";
    description?: string;
    tooltip?: string;
    collapsible: boolean = false;
}

type BevyQueryEntityResponse = {
    entity: number,
    components: {
        "bevy_hierarchy::components::children::Children"?: number[],
        "bevy_hierarchy::components::parent::Parent"?: number,
        "bevy_core::name::Name"?: {
            hash: number,
            name: string,
        },
    },
    has?: {},
}

type BevyGetComponentResponse = {
    components: [],
    errors: {},
}