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

    async get_all_entities() {
        await this.query_all_entities();

        return Array.from(this.entities.values()).filter(entity => !entity.has_parent());
    }

    async get_components_of_entity(entity: number) {
        await this.query_components_for_entity(entity);

        return Array.from(this.entities.get(entity)?.get_component_list() ?? []);
    }

    async get_parms_of_entity_component(entity: number, component: string) {
        await this.query_parms_for_entity_component(entity, component);

        return Array.from(this.entities.get(entity)?.get_component_parm_list(component) ?? []);
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

    private _onUpdate() {
        if (this.onUpdate) {
            this.onUpdate();
        }
    }

    private create_entity(response: BevyQueryEntityResponse) {
        let entity = new BevyEntity(response);

        this.entities.set(response.entity, entity);

        // this._onUpdate();
    }

    private create_component_of_entity(id: number, path: string) {
        this.entities.get(id)?.components.set(path, new BevyComponent(id, path));
        
        // this._onUpdate();
    }

    private create_parms_of_components_for_entity(entity: number, component_map: { [key: string]: any }) {

        for (let component_path in component_map) {
            let component = new BevyComponent(entity, component_path, component_map[component_path]);

            this.entities.get(entity)?.components.set(component_path, component);
        }

        // this._onUpdate();
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
            const response = await axios.post(this.url, body) as axios.AxiosResponse<BevyQueryResponse, any>;

            (response.data.result).forEach(entity => {
                this.create_entity(entity);
                this.query_components_for_entity(entity.entity);
            });

        } catch (error: any) {
            console.log(error); // TODO: replace with OUTPUT
        }
    }

    private async query_components_for_entity(entity: number) {
        const body = {
            "jsonrpc": "2.0",
            "method": "bevy/list",
            "id": entity,
            "params": {
                "entity": entity,
            },
        };

        try {
            const response = await axios.post(this.url, body) as axios.AxiosResponse<BevyListResponse, any>;

            (response.data.result).forEach(component => {
                this.create_component_of_entity(entity, component);
            });
        } catch (error: any) {
            console.log(error); // TODO: replace with OUTPUT
        }
    }

    private async query_parms_for_entity_component(entity: number, component: string) {
        const body = {
            "jsonrpc": "2.0",
            "method": "bevy/get",
            "id": entity,
            "params": {
                "entity": entity,
                "components": [component],
            },
        };

        try {
            const response = await axios.post(this.url, body) as axios.AxiosResponse<BevyGetResponse, any>;

            this.create_parms_of_components_for_entity(entity, response.data.result.components);
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

    get_component_parm_list(component: string) {
        return Array.from(this.components.get(component)?.parms ?? []);
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

    parms: BevyComponentParm[];

    constructor(
        id: number,
        path: string,
        parms?: any[],
    ) {
        this.entity = id;
        this.path = path;
        this.name = path.split('<')[0].split('::').at(-1) ?? path;

        this.tooltip = this.path;

        this.parms = [];

        if (parms) {
            if (Object.prototype.toString.call(parms) === '[object Array]' || Object.prototype.toString.call(parms) === '[object Object]') {
                for (let name in parms) {
                    this.parms.push(new BevyComponentParm(name, parms[name]));   
                }
            } else {
                this.parms.push(new BevyComponentParm("", parms));
            }
        }
    }
}

export class BevyComponentParm {
    name: string = "";
    description?: string;
    tooltip?: string;
    collapsible: boolean = false;
    
    parm: any;

    subparms?: BevyComponentParm[];
    
    constructor (
        name: string,
        parm: any,
    ) {
        this.name = name;
        this.parm = parm;

        console.log(`${name}: ${parm}`);
        console.log(Object.prototype.toString.call(parm));

        if(Object.prototype.toString.call(parm) === '[object Array]' || Object.prototype.toString.call(parm) === '[object Object]') {
            this.collapsible = true;
            this.subparms = [];

            for (let subparm in this.parm) {
                this.subparms.push(new BevyComponentParm(subparm, this.parm[subparm]));
            }
        } else {
            this.collapsible = false;
            this.description = `${this.parm}`;
        }
    }
}

export class BevyComponentParmString {
    name: string = "";
    description?: string;
    tooltip?: string;
    collapsible: boolean = false;
}

type BevyResponseError = {
    code: number,
    message: string,
}

type BevyResponse = {
    jsonrpc: string,
    id: number,
    result: any,
}

type BevyGetResponse = {
    jsonrpc: string,
    id: number,
    result: {
        components: {
            [key: string]: any,
        },
        errors: {
            [key: string]: BevyResponseError,
        },
    }
}

type BevyQueryResponse = {
    jsonrpc: string,
    id: number,
    result: BevyQueryEntityResponse[]
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
        [any: string]: any,
    }
    has: {
        [key: string]: boolean,
    },
}


type BevySpawnResponse = {
    jsonrpc: string,
    id: number,
    result: {
        entity: number,
    }
}

type BevyDestroyResponse = {
    jsonrpc: string,
    id: number,
    result: null,
}

type BevyInsertResponse = {
    jsonrpc: string,
    id: number,
    result: null,   
}

type BevyReparentResponse = {
    jsonrpc: string,
    id: number,
    result: null,
}

type BevyListResponse = {
    jsonrpc: string,
    id: number,
    result: string[],
}

type BevyGetWatchResponse = {
    jsonrpc: string,
    id: number,
    result: {
        components: {
            [key: string]: any,
        },
        removed: string[],
        errors: {
            [key: string]: BevyResponseError,
        },
    }
}

type BevyListWatchResponse = {
    jsonrpc: string,
    id: number,
    result: {
        added: string[],
        removed: string[],
    }
}