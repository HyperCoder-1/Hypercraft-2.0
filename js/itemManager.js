import ItemEntity from './itemEntity.js';

export default class ItemManager {
  constructor(cm, scene, inventory) {
    this.cm = cm;
    this.scene = scene;
    this.inventory = inventory;
    this.items = [];
  }

  spawnItem(blockId, x, y, z) {
    const item = new ItemEntity(blockId, x, y, z, this.cm);
    this.items.push(item);
    this.scene.add(item.mesh);
    return item;
  }

  update(dt, playerAABB) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const status = item.update(dt, playerAABB);

      if (status === 'pickup') {
        // Add to inventory
        if (this.inventory && typeof this.inventory.addItem === 'function') {
          this.inventory.addItem(item.blockId, 1);
        }
        // Remove from scene and array
        this.scene.remove(item.mesh);
        item.dispose();
        this.items.splice(i, 1);
      } else if (status === 'despawn') {
        // Remove from scene and array
        this.scene.remove(item.mesh);
        item.dispose();
        this.items.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const item of this.items) {
      this.scene.remove(item.mesh);
      item.dispose();
    }
    this.items = [];
  }
}
