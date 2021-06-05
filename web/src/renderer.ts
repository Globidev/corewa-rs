import * as PIXI from "pixi.js";

import { Player } from "./virtual_machine";

// @ts-ignore
import cells from "./assets/cells.png";

import type { Memory } from "corewa-rs";
import { memory as wasm_memory } from "corewa-rs/corewa_rs_wasm_bg.wasm";

PIXI.utils.skipHello();

const MAX_CELL_AGE = 1024;
const MEM_SIZE = 4096;
const BYTE_WIDTH = 18;
const BYTE_HEIGHT = 13;
const ROWS = 64;
const COLUMNS = 64;
const X_SPACING = 2;
const Y_SPACING = 1;

export const MARGIN = 5;
export const MEM_WIDTH =
  (BYTE_WIDTH + X_SPACING) * COLUMNS + (MARGIN - X_SPACING);
export const MEM_HEIGHT =
  (BYTE_HEIGHT + Y_SPACING) * ROWS + (MARGIN - Y_SPACING);

type Modifiers = {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
};

interface RendererSetup {
  canvas: HTMLCanvasElement;
  onCellClicked: (idx: number, modifiers: Modifiers) => void;
  onLoad: () => void;
}

interface RenderContext {
  memory: Memory;
  selections: { idx: number; length: number }[];
  playersById: Map<number, Player>;
}

export class PIXIRenderer {
  application: PIXI.Application;
  cells: Cell[] = [];
  cellTextures: PIXI.Texture[] = [];

  constructor(setup: RendererSetup) {
    const app = new PIXI.Application({
      view: setup.canvas,
      width: MEM_WIDTH,
      height: MEM_HEIGHT,
      backgroundColor: 0x000000,
    });
    // Stop the automatic rendering since we do not continuously update
    app.stop();

    app.loader.add(cells).load(() => this.load(setup));

    this.application = app;
  }

  load(setup: RendererSetup) {
    const cellSheet = PIXI.utils.TextureCache[cells] as PIXI.Texture;

    for (let i = 0; i <= 0xff; ++i) {
      const [x, y] = cellPos(i);

      const frame = new PIXI.Rectangle(
        x * BYTE_WIDTH,
        y * BYTE_HEIGHT,
        BYTE_WIDTH,
        BYTE_HEIGHT
      );
      cellSheet.frame = frame;

      this.cellTextures.push(cellSheet.clone());
    }

    for (let i = 0; i < MEM_SIZE; ++i) {
      const [x, y] = cellPos(i);

      const cell = new Cell(x, y);
      cell.valueSprite.on(
        "click",
        (pixiEvent: PIXI.interaction.InteractionEvent) => {
          const event = pixiEvent.data.originalEvent;
          setup.onCellClicked(i, {
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
          });
        }
      );

      this.cells.push(cell);
      this.application.stage.addChild(cell.valueSprite);
    }

    setup.onLoad();
  }

  update(ctx: RenderContext) {
    const cellValues = new Uint8Array(
      wasm_memory.buffer,
      ctx.memory.values_ptr,
      MEM_SIZE
    );
    const cellAges = new Uint16Array(
      wasm_memory.buffer,
      ctx.memory.ages_ptr,
      MEM_SIZE
    );
    const cellOwners = new Int32Array(
      wasm_memory.buffer,
      ctx.memory.owners_ptr,
      MEM_SIZE
    );
    const pcCounts = new Uint32Array(
      wasm_memory.buffer,
      ctx.memory.pc_count_ptr,
      MEM_SIZE
    );

    for (let i = 0; i < MEM_SIZE; ++i) {
      const cellValue = cellValues[i];
      const cellOwner = cellOwners[i];
      const cellAge = cellAges[i];
      const pcCount = pcCounts[i];

      let player = ctx.playersById.get(cellOwner);
      let color = player !== undefined ? player.color : 0x404040;

      this.cells[i].update(
        this.cellTextures[cellValue],
        cellOwner,
        cellAge,
        pcCount,
        color
      );
    }

    ctx.selections.forEach((selection) => {
      for (let i = 0; i < selection.length; ++i)
        this.cells[(selection.idx + i) % MEM_SIZE].selectionSprite.visible =
          true;
    });

    this.application.render();
  }
}

class Cell {
  valueSprite: PIXI.Sprite;
  pcSprite: PIXI.Sprite;
  ageSprite: PIXI.Sprite;
  selectionSprite: PIXI.Sprite;

  constructor(x: number, y: number) {
    const valueSprite = new PIXI.Sprite();
    valueSprite.x = MARGIN + x * (BYTE_WIDTH + X_SPACING);
    valueSprite.y = MARGIN + y * (BYTE_HEIGHT + Y_SPACING);
    valueSprite.interactive = true;

    const pcSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    pcSprite.width = BYTE_WIDTH;
    pcSprite.height = BYTE_HEIGHT;
    pcSprite.x = -X_SPACING;
    pcSprite.y = -Y_SPACING;

    const ageSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    ageSprite.width = BYTE_WIDTH;
    ageSprite.height = BYTE_HEIGHT;
    ageSprite.x = -X_SPACING;
    ageSprite.y = -Y_SPACING;

    const selectionSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    selectionSprite.tint = 0xff0000;
    selectionSprite.alpha = 0.4;
    selectionSprite.width = BYTE_WIDTH;
    selectionSprite.height = BYTE_HEIGHT;
    selectionSprite.x = -X_SPACING;
    selectionSprite.y = -Y_SPACING;
    selectionSprite.visible = false;

    valueSprite.addChild(pcSprite, ageSprite, selectionSprite);

    this.valueSprite = valueSprite;
    this.pcSprite = pcSprite;
    this.ageSprite = ageSprite;
    this.selectionSprite = selectionSprite;
  }

  update(
    valueTexture: PIXI.Texture,
    owner: number,
    age: number,
    pcCount: number,
    color: number
  ) {
    const pcAlpha = pcCount !== 0 ? 0.5 + (pcCount - 1) * 0.05 : 0;
    const ageAlpha = owner !== 0 ? 0.35 * (age / MAX_CELL_AGE) : 0;

    this.valueSprite.texture = valueTexture;
    this.valueSprite.tint = color;
    this.pcSprite.alpha = pcAlpha;
    this.ageSprite.tint = color;
    this.ageSprite.alpha = ageAlpha;
    this.selectionSprite.visible = false;
  }
}

function cellPos(cellIdx: number): [number, number] {
  const x = cellIdx % COLUMNS;
  const y = Math.floor(cellIdx / COLUMNS);

  return [x, y];
}
