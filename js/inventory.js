import { CREATIVE_BLOCKS, getTextureKeyForBlockId, texturePaths, BLOCK_AIR, BLOCK_CRAFTING_TABLE, BLOCK_WOOD } from './chunkManager.js';

// minimal recipe list for crafting (ids must match block constants)
const RECIPES = [
  // single log to 4 planks
  { pattern: [
      [BLOCK_WOOD, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ], output: { id: 127 /* oak planks */, qty: 4 } },
  // 2x2 planks -> crafting table
  { pattern: [
      [127,127,0],
      [127,127,0],
      [0,0,0]
    ], output: { id: BLOCK_CRAFTING_TABLE, qty:1 } }
];

// utility to flatten pattern (numeric ids) to a string key
function patternKey(pattern) {
  return pattern.map(row => row.map(cell => (cell || 0)).join(',')).join(';');
}

export default class Inventory {
  constructor(interaction) {
    this.interaction = interaction;
    this.hotbarSize = 9;
    // each slot holds {id,count}
    this.slots = new Array(this.hotbarSize).fill(null).map(() => ({ id: BLOCK_AIR, count: 0 }));
    this.selectedIndex = 0;
    this.creative = false; // start in survival by default

    // crafting state
    this.craftGrid = new Array(9).fill(null).map(() => ({ id: BLOCK_AIR, count: 0 }));

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
    this.craftOverlay = document.getElementById('crafting');
    this.craftGridEl = document.getElementById('crafting-grid');
    this.craftResultEl = document.getElementById('crafting-result');
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
    const slot = this.slots[this.selectedIndex];
    const id = slot ? slot.id : BLOCK_AIR;
    if (this.interaction && typeof this.interaction.setPlaceBlock === 'function') {
      this.interaction.setPlaceBlock(id);
    }
  }

  setSlot(idx, blockId, count = 1) {
    if (idx < 0 || idx >= this.hotbarSize) return;
    this.slots[idx] = { id: blockId, count };
    this._updateSlotUI(idx);
  }

  _updateSlotUI(idx) {
    const slotEl = this.hotbarSlots[idx];
    if (!slotEl) return;
    slotEl.innerHTML = ''; // clear
    const slot = this.slots[idx];
    if (slot && slot.id && slot.id !== BLOCK_AIR && slot.count > 0) {
      const key = getTextureKeyForBlockId(slot.id);
      if (key && texturePaths[key]) {
        const img = document.createElement('img');
        img.src = texturePaths[key];
        slotEl.appendChild(img);
        if (slot.count > 1) {
          const qty = document.createElement('div');
          qty.textContent = slot.count;
          qty.style.position = 'absolute';
          qty.style.bottom = '0';
          qty.style.right = '2px';
          qty.style.color = 'white';
          qty.style.fontSize = '10px';
          slotEl.appendChild(qty);
        }
      }
    }
  }

  toggleInventory() {
    if (this.craftOverlay && !this.craftOverlay.classList.contains('hidden')) {
      this.closeCrafting();
    }
    if (!this.invOverlay) return;
    if (this.invOverlay.classList.contains('hidden')) {
      this.openInventory();
    } else {
      this.closeInventory();
    }
  }

  openInventory() {
    if (!this.invOverlay) return;
    this.closeCrafting();
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
      items = this.slots.map(s => s.id);
    }

    items.forEach((id, idx) => {
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
          this.setSlot(this.selectedIndex, id, 1);
          this.selectSlot(this.selectedIndex);
        }
        this.closeInventory();
      });
      this.invGrid.appendChild(slot);
    });
  }

  // crafting helpers
  openCrafting() {
    if (!this.craftOverlay) return;
    this.closeInventory();
    this.craftOverlay.classList.remove('hidden');
    this._renderCraftingGrid();
    this._updateCraftResult();
    this._bindCraftingSlots();
  }

  closeCrafting() {
    if (!this.craftOverlay) return;
    this.craftOverlay.classList.add('hidden');
    this.craftGrid.forEach(cell => { cell.id = BLOCK_AIR; cell.count = 0; });
    this.craftGridEl.innerHTML = '';
    this.craftResultEl.innerHTML = '';
  }

  _renderCraftingGrid() {
    this.craftGridEl.innerHTML = '';
    this.craftGrid.forEach((cell, idx) => {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      slot.dataset.index = idx;
      this._renderCell(slot, cell);
      this.craftGridEl.appendChild(slot);
    });
  }

  _renderCell(slotEl, cell) {
    slotEl.innerHTML = '';
    if (cell.id && cell.id !== BLOCK_AIR) {
      const key = getTextureKeyForBlockId(cell.id);
      if (key && texturePaths[key]) {
        const img = document.createElement('img');
        img.src = texturePaths[key];
        slotEl.appendChild(img);
        if (cell.count > 1) {
          const qty = document.createElement('div');
          qty.textContent = cell.count;
          qty.style.position = 'absolute';
          qty.style.bottom = '0';
          qty.style.right = '2px';
          qty.style.color = 'white';
          qty.style.fontSize = '10px';
          slotEl.appendChild(qty);
        }
      }
    }
  }

  _bindCraftingSlots() {
    this.craftGridEl.childNodes.forEach(node => {
      node.onclick = () => {
        const i = parseInt(node.dataset.index);
        this._handleCraftSlotClick(i);
      };
    });
    this.craftResultEl.onclick = () => {
      const recipe = this._findMatchingRecipe();
      if (recipe) {
        this._consumeRecipe(recipe);
      }
    };
  }

  _handleCraftSlotClick(idx) {
    const sel = this.slots[this.selectedIndex];
    const cell = this.craftGrid[idx];
    if (sel && sel.id !== BLOCK_AIR && sel.count > 0) {
      // add one to crafting grid
      if (cell.id === BLOCK_AIR || cell.id === sel.id) {
        cell.id = sel.id;
        cell.count += 1;
        sel.count -= 1;
        if (sel.count === 0) sel.id = BLOCK_AIR;
        this._updateSlotUI(this.selectedIndex);
      }
    } else if (cell && cell.id !== BLOCK_AIR) {
      // remove one back to hotbar
      const hslot = this.slots[this.selectedIndex];
      if (hslot.id === cell.id || hslot.id === BLOCK_AIR) {
        hslot.id = cell.id;
        hslot.count += 1;
        cell.count -= 1;
        if (cell.count === 0) cell.id = BLOCK_AIR;
        this._updateSlotUI(this.selectedIndex);
      }
    }
    this._renderCraftingGrid();
    this._updateCraftResult();
  }

  _findMatchingRecipe() {
    const key = patternKey(
      [0,1,2].map(r => [0,1,2].map(c => {
        const cell = this.craftGrid[r*3+c];
        return cell ? cell.id : 0;
      }))
    );
    return RECIPES.find(r => patternKey(r.pattern) === key);
  }

  _updateCraftResult() {
    this.craftResultEl.innerHTML = '';
    const recipe = this._findMatchingRecipe();
    if (recipe) {
      const img = document.createElement('img');
      const key = getTextureKeyForBlockId(recipe.output.id);
      if (key && texturePaths[key]) {
        img.src = texturePaths[key];
        this.craftResultEl.appendChild(img);
      }
    }
  }

  _consumeRecipe(recipe) {
    // decrement grid cells
    recipe.pattern.forEach((row,r) => row.forEach((cell,c) => {
      if (cell) {
        const gridCell = this.craftGrid[r*3+c];
        if (gridCell.count>0) gridCell.count -=1;
        if (gridCell.count===0) gridCell.id = BLOCK_AIR;
      }
    }));
    // add output to hotbar or inventory
    this.addItem(recipe.output.id, recipe.output.qty);
    this._renderCraftingGrid();
    this._updateCraftResult();
  }

  addItem(id, qty=1) {
    // put in selected slot or merge if same
    const slot = this.slots[this.selectedIndex];
    if (slot.id === id || slot.id === BLOCK_AIR) {
      slot.id = id;
      slot.count += qty;
      this._updateSlotUI(this.selectedIndex);
      return true;
    }
    // otherwise first empty slot
    for (let i=0;i<this.hotbarSize;i++) {
      if (this.slots[i].id===BLOCK_AIR) {
        this.slots[i].id=id;
        this.slots[i].count=qty;
        this._updateSlotUI(i);
        return true;
      }
    }
    return false; // no space
  }
}
