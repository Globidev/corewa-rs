import * as PIXI from "pixi.js";

import type { Memory } from "corewa-rs";
import { contrastingColor } from "./utils";

PIXI.utils.skipHello();

const MAX_CELL_AGE = 1024;
const MEM_SIZE = 4096;
const BYTE_WIDTH = 18;
const BYTE_HEIGHT = 15;
const ROWS = 64;
const COLUMNS = 64;
const X_SPACING = 2;
const Y_SPACING = 2;

export const MARGIN = 3;
export const MEM_WIDTH =
  (BYTE_WIDTH + X_SPACING) * COLUMNS + MARGIN * 2 - X_SPACING;
export const MEM_HEIGHT =
  (BYTE_HEIGHT + Y_SPACING) * ROWS + MARGIN * 2 - Y_SPACING;

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
  showValues: boolean;
  memory: Memory;
  selections: { idx: number; length: number }[];
  playerColors: number[];
}

export class PIXIRenderer {
  application: PIXI.Application;
  cells: Cell[] = [];
  cellTextures: PIXI.Texture[] = [];
  cellTextures2: PIXI.Texture[] = [];

  constructor(setup: RendererSetup, private wasmMemory: WebAssembly.Memory) {
    const app = new PIXI.Application({
      view: setup.canvas,
      width: MEM_WIDTH,
      height: MEM_HEIGHT,
      backgroundColor: 0x000000,
    });
    // Stop the automatic rendering since we do not continuously update
    app.stop();

    // TODO
    setTimeout(() => {
      this.load(setup);
    }, 0);

    this.application = app;
  }

  load(setup: RendererSetup) {
    // const cellSheet = PIXI.utils.TextureCache[cells] as PIXI.Texture;

    for (let i = 0; i <= 0xff; ++i) {
      {
        const cellText = new PIXI.Text(
          i.toString(16).padStart(2, "0").toUpperCase(),
          {
            fontFamily: "'Roboto Mono', monospace",
            fill: 0x000000,
            // align: "center",
            // fontSize: ,
            fontWeight: "600",
          }
        );
        cellText.width = BYTE_WIDTH;
        cellText.height = BYTE_HEIGHT;
        this.cellTextures.push(cellText.texture);
      }

      const cellText = new PIXI.Text(
        i.toString(16).padStart(2, "0").toUpperCase(),
        {
          fontFamily: "'Roboto Mono', monospace",
          fill: 0xaaaaaa,
          // align: "center",
          // fontSize: ,
          fontWeight: "500",
        }
      );
      cellText.width = BYTE_WIDTH;
      cellText.height = BYTE_HEIGHT;
      this.cellTextures2.push(cellText.texture);
    }

    for (let i = 0; i < MEM_SIZE; ++i) {
      const [x, y] = cellPos(i);

      const cell = new Cell(x, y);
      cell.sp.on("click", (pixiEvent: PIXI.InteractionEvent) => {
        const event = pixiEvent.data.originalEvent;
        setup.onCellClicked(i, {
          ctrl: event.ctrlKey,
          shift: event.shiftKey,
          alt: event.altKey,
        });
      });

      this.cells.push(cell);
      this.application.stage.addChild(cell.sp);
    }

    setup.onLoad();
  }

  update(ctx: RenderContext) {
    const cellValues = new Uint8Array(
      this.wasmMemory.buffer,
      ctx.memory.values_ptr,
      MEM_SIZE
    );
    const cellAges = new Uint16Array(
      this.wasmMemory.buffer,
      ctx.memory.ages_ptr,
      MEM_SIZE
    );
    const cellOwners = new Int32Array(
      this.wasmMemory.buffer,
      ctx.memory.owners_ptr,
      MEM_SIZE
    );
    const pcCounts = new Uint32Array(
      this.wasmMemory.buffer,
      ctx.memory.pc_count_ptr,
      MEM_SIZE
    );

    for (let i = 0; i < MEM_SIZE; ++i) {
      const cellValue = cellValues[i];
      const cellOwner = cellOwners[i];
      const cellAge = cellAges[i];
      const pcCount = pcCounts[i];

      const color = ctx.playerColors[cellOwner] ?? 0x404040;
      const contrasting = contrastingColor(color);
      // const valueAlpha = valueTint > 0x888888 ? 0.7 : 1.0;

      this.cells[i].update(
        contrasting < 0x888888
          ? this.cellTextures[cellValue]
          : this.cellTextures2[cellValue],
        cellOwner,
        cellAge,
        pcCount,
        color,
        ctx.showValues
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
  sp: PIXI.Sprite;
  value: PIXI.Sprite;
  pcSprite: PIXI.Sprite;
  ageSprite: PIXI.Sprite;
  selectionSprite: PIXI.Sprite;

  constructor(x: number, y: number) {
    const sp = new PIXI.Sprite(PIXI.Texture.WHITE);
    sp.x = MARGIN + x * (BYTE_WIDTH + X_SPACING);
    sp.y = MARGIN + y * (BYTE_HEIGHT + Y_SPACING);
    sp.width = BYTE_WIDTH;
    sp.height = BYTE_HEIGHT;
    sp.interactive = true;

    const value = new PIXI.Sprite();
    value.width = BYTE_WIDTH - 2;
    value.height = BYTE_HEIGHT;

    const pcSprite = new PIXI.Sprite(PIXI.Texture.WHITE);

    const ageSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    ageSprite.tint = 0xcccccc;

    const selectionSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    selectionSprite.tint = 0xff0000;
    selectionSprite.alpha = 0.4;
    selectionSprite.visible = false;

    sp.addChild(value, pcSprite, ageSprite, selectionSprite);

    this.sp = sp;
    this.value = value;
    this.pcSprite = pcSprite;
    this.ageSprite = ageSprite;
    this.selectionSprite = selectionSprite;
  }

  update(
    valueTexture: PIXI.Texture,
    owner: number,
    age: number,
    pcCount: number,
    color: number,
    showValue: boolean
  ) {
    const pcAlpha = pcCount !== 0 ? 0.5 + (pcCount - 1) * 0.05 : 0;
    const ageAlpha = owner !== 0 ? 0.3 * (age / MAX_CELL_AGE) : 0;

    this.sp.tint = color;

    this.value.texture = valueTexture;
    this.value.visible = showValue;

    this.pcSprite.alpha = pcAlpha;
    this.ageSprite.alpha = ageAlpha;

    this.selectionSprite.visible = false;
  }
}

function cellPos(cellIdx: number): [number, number] {
  const x = cellIdx % COLUMNS;
  const y = Math.floor(cellIdx / COLUMNS);

  return [x, y];
}
