import { CREATIVE_BLOCKS, getTextureKeyForBlockId, texturePaths, BLOCK_AIR } from './chunkManager.js';

// simple inventory/hotbar manager
export default class Inventory {
  constructor(interaction) {
    this.interaction = interaction;
    this.hotbarSize = 9;
    this.slots = new Array(this.hotbarSize).fill(BLOCK_AIR);
    this.selectedIndex = 0;
    this.creative = false; // start in survival by default

    this._buildHotbarUI();
    this._bindInput();
  }

  _buildHotbarUI() {
    this.hotbarSlots = [];
    for (let i = 0; i < this.hotbarSize; i++) {
      const slotEl = document.getElementById(`slot-${i}`);
      if (!slotEl) continue;
      slotEl.addEventListener('click', () => this.selectSlot(i));
      this.hotbarSlots.push(slotEl);
      this._updateSlotUI(i);
    }
    // also create inventory grid parent
    this.invOverlay = document.getElementById('inventory');
    this.invGrid = document.getElementById('inventory-grid');
  }

  _bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.code.startsWith('Digit')) {
        const num = parseInt(e.code.slice(5));
        if (!isNaN(num)) {
          const idx = num === 0 ? 9 : num;
          this.selectSlot(idx - 1);
        }
      }
      if (e.code === 'KeyE') {
        this.toggleInventory();
      }
      if (e.code === 'KeyC') {
        this.toggleCreativeMode();
      }
    });

    window.addEventListener('wheel', (e) => {
      // scroll to change slot
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      let newIndex = (this.selectedIndex + delta + this.hotbarSize) % this.hotbarSize;
      this.selectSlot(newIndex);
    }, { passive: false });
  }

  selectSlot(idx) {
    if (idx < 0 || idx >= this.hotbarSize) return;
    // update selection classes
    if (this.hotbarSlots[this.selectedIndex]) {
      this.hotbarSlots[this.selectedIndex].classList.remove('selected');
    }
    this.selectedIndex = idx;
    if (this.hotbarSlots[this.selectedIndex]) {
      this.hotbarSlots[this.selectedIndex].classList.add('selected');
    }
    // tell interaction which block to place
    const id = this.slots[this.selectedIndex] || BLOCK_AIR;
    if (this.interaction && typeof this.interaction.setPlaceBlock === 'function') {
      this.interaction.setPlaceBlock(id);
    }
  }

  setSlot(idx, blockId) {
    if (idx < 0 || idx >= this.hotbarSize) return;
    this.slots[idx] = blockId;
    this._updateSlotUI(idx);
  }

  _updateSlotUI(idx) {
    const slotEl = this.hotbarSlots[idx];
    if (!slotEl) return;
    slotEl.innerHTML = ''; // clear
    const id = this.slots[idx];
    if (id && id !== BLOCK_AIR) {
      const key = getTextureKeyForBlockId(id);
      if (key && texturePaths[key]) {
        const img = document.createElement('img');
        img.src = texturePaths[key];
        slotEl.appendChild(img);
      }
    }
  }

  toggleInventory() {
    if (!this.invOverlay) return;
    if (this.invOverlay.classList.contains('hidden')) {
      this.openInventory();
    } else {
      this.closeInventory();
    }
  }

  openInventory() {
    if (!this.invOverlay) return;
    this.invOverlay.classList.remove('hidden');
    this.populateInventory();
  }

  closeInventory() {
    if (!this.invOverlay) return;
    this.invOverlay.classList.add('hidden');
    this.invGrid.innerHTML = '';
  }

  toggleCreativeMode() {
    this.creative = !this.creative;
    // automatically open inventory when switching to creative
    if (this.creative) {
      this.openInventory();
    } else {
      this.closeInventory();
    }
    console.log('Creative mode', this.creative ? 'enabled' : 'disabled');
  }

  populateInventory() {
    // simple single-tier inventory: in creative show all blocks, in survival show only hotbar contents
    this.invGrid.innerHTML = '';
    let items = [];
    if (this.creative) {
      items = CREATIVE_BLOCKS.slice();
    } else {
      items = this.slots.slice();
    }

    items.forEach((id) => {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      if (id && id !== BLOCK_AIR) {
        const key = getTextureKeyForBlockId(id);
        if (key && texturePaths[key]) {
          const img = document.createElement('img');
          img.src = texturePaths[key];
          slot.appendChild(img);
        }
      }
      slot.addEventListener('click', () => {
        if (this.creative && id && id !== BLOCK_AIR) {
          // put into currently selected hotbar slot
          this.setSlot(this.selectedIndex, id);
          this.selectSlot(this.selectedIndex);
        }
        this.closeInventory();
      });
      this.invGrid.appendChild(slot);
    });
  }
}
