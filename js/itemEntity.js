import * as THREE from './three.module.js';
import { getTextureKeyForBlockId, texturePaths } from './chunkManager.js';

export default class ItemEntity {
  constructor(blockId, x, y, z, cm) {
    this.blockId = blockId;
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 4,  // random horizontal scatter
      4,                           // upward bounce
      (Math.random() - 0.5) * 4
    );
    this.cm = cm;
    this.lifetime = 0;
    this.maxLifetime = 300; // 5 minutes in seconds
    this.size = 0.25; // item cube is 1/4 block size
    this.gravity = 25; // blocks per second squared
    this.onGround = false;

    // Create mesh for rendering
    this.mesh = this._createMesh();
  }

  _createMesh() {
    const key = getTextureKeyForBlockId(this.blockId);
    const texturePath = (key && texturePaths[key]) ? texturePaths[key] : null;
    
    const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
    let material;
    
    if (texturePath) {
      const texture = new THREE.TextureLoader().load(texturePath);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      material = new THREE.MeshPhongMaterial({ map: texture });
    } else {
      material = new THREE.MeshPhongMaterial({ color: 0x888888 });
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  update(dt, playerAABB) {
    // Apply gravity
    this.velocity.y -= this.gravity * dt;

    // Move item
    this.position.add(this.velocity.clone().multiplyScalar(dt));

    // Simple collision with ground (blocks)
    const bottomY = this.position.y - this.size / 2;
    if (bottomY <= 0) {
      this.position.y = this.size / 2;
      this.velocity.y *= -0.5; // bounce with energy loss
      if (Math.abs(this.velocity.y) < 0.5) {
        this.velocity.y = 0;
        this.onGround = true;
      }
    } else {
      this.onGround = false;
      // Check collision with terrain
      const blockAtPos = this.cm.getBlockAtWorld(this.position.x, bottomY, this.position.z);
      if (blockAtPos !== 0 && blockAtPos !== 14) {
        this.position.y = bottomY + 1 + this.size / 2;
        this.velocity.y *= -0.5;
        if (Math.abs(this.velocity.y) < 0.5) {
          this.velocity.y = 0;
          this.onGround = true;
        }
      }
    }

    // Friction when on ground
    if (this.onGround) {
      this.velocity.x *= 0.95;
      this.velocity.z *= 0.95;
    }

    // Update mesh position
    this.mesh.position.copy(this.position);

    // Update lifetime
    this.lifetime += dt;

    // Check if picked up (within ~0.8 blocks of player center)
    if (playerAABB) {
      const playerCenterX = (playerAABB.minX + playerAABB.maxX) / 2;
      const playerCenterY = (playerAABB.minY + playerAABB.maxY) / 2;
      const playerCenterZ = (playerAABB.minZ + playerAABB.maxZ) / 2;
      
      const dx = this.position.x - playerCenterX;
      const dy = this.position.y - playerCenterY;
      const dz = this.position.z - playerCenterZ;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (dist < 0.8) {
        return 'pickup'; // signal that this item should be picked up
      }
    }

    // Check if despawned
    if (this.lifetime >= this.maxLifetime) {
      return 'despawn';
    }

    return null; // still active
  }

  dispose() {
    if (this.mesh && this.mesh.geometry) this.mesh.geometry.dispose();
    if (this.mesh && this.mesh.material) {
      if (this.mesh.material.map) this.mesh.material.map.dispose();
      this.mesh.material.dispose();
    }
  }
}
