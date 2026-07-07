/**
 * World is the container for all entities and their components.
 */
export class World {
    constructor() {
        this.entities = new Map();
    }
    createEntity(id) {
        this.entities.set(id, new Map());
    }
    addComponent(entityId, component) {
        const entity = this.entities.get(entityId);
        if (!entity) {
            throw new Error(`Entity ${entityId} not found`);
        }
        entity.set(component.type, component);
    }
    getEntity(id) {
        const components = this.entities.get(id);
        if (!components) {
            return undefined;
        }
        return {
            id,
            components: new Map(components),
        };
    }
    getAllEntities() {
        const result = new Map();
        for (const [id, components] of this.entities) {
            result.set(id, {
                id,
                components: new Map(components),
            });
        }
        return result;
    }
}
//# sourceMappingURL=world.js.map