import * as PIXI from "pixi.js";

import { CorewarPlayer } from "./state/player";

import { clamp } from "./utils";

import type { Memory } from "corewa-rs";

PIXI.utils.skipHello();

const MAX_CELL_AGE = 1024;
const MEM_SIZE = 4096;
const BYTE_WIDTH = 18;
const BYTE_HEIGHT = 15;
const ROWS = 64;
const COLUMNS = 64;
const X_SPACING = 2;
const Y_SPACING = 2;

const UNOWNED_COLORS = {
  color: 0x404040,
  contrastColor: "light",
};

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
}

interface RenderContext {
  showValues: boolean;
  memory: Memory;
  selections: { idx: number; length: number }[];
  players: CorewarPlayer[];
}

export class PIXIRenderer {
  application: PIXI.Application;
  cells: Cell[] = [];
  valueTexturesDark: PIXI.Texture[] = [];
  valueTexturesLight: PIXI.Texture[] = [];

  renderTimeoutHandle: number | undefined;
  renderTimeoutCleared = 0;

  constructor(setup: RendererSetup, private wasmMemory: WebAssembly.Memory) {
    const app = new PIXI.Application({
      view: setup.canvas,
      width: MEM_WIDTH,
      height: MEM_HEIGHT,
      backgroundColor: 0x1d2025,
    });
    // Stop the automatic rendering since we do not continuously update
    app.stop();

    this.application = app;

    this.load(setup);
  }

  load(setup: RendererSetup) {
    const stage = this.application.stage;

    const textStyle = <const>{
      fontFamily: "'Roboto Mono', monospace",
      align: "center",
      fontSize: BYTE_WIDTH,
      fontWeight: "600",
    };

    const passes = [
      { fill: 0x000000, container: this.valueTexturesDark },
      { fill: 0xaaaaaa, container: this.valueTexturesLight },
    ];

    for (let val = 0; val <= 0xff; ++val) {
      const textValue = val.toString(16).padStart(2, "0").toUpperCase();

      for (const { fill, container } of passes) {
        const text = new PIXI.Text(textValue, { ...textStyle, fill });
        text.width = BYTE_WIDTH;
        text.height = BYTE_HEIGHT;
        container.push(text.texture);
      }
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
      stage.addChild(cell.sp);
    }

    stage.interactive = true;

    stage.addListener("mousemove", (event) => {
      if (event.data.buttons === 1) {
        event.data.originalEvent.preventDefault();

        const { movementX: dx, movementY: dy } = event.data.originalEvent;
        this.moveViewport(dx, dy);
        this.renderLater();
      }
    });

    setup.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      const { deltaY } = event;
      this.scaleViewport((-deltaY / 100) * 0.1);
      this.renderLater();
    });
  }

  renderLater() {
    if (this.renderTimeoutHandle !== undefined) {
      clearTimeout(this.renderTimeoutHandle);
      this.renderTimeoutCleared += 1;
    }

    if (this.renderTimeoutCleared >= 3) {
      this.renderTimeoutCleared = 0;
      this.application.render();
    }

    this.renderTimeoutHandle = setTimeout(() => {
      this.application.render();
      this.renderTimeoutHandle = undefined;
    }, 10);
  }

  moveViewport(dx: number, dy: number) {
    const stage = this.application.stage;
    const scaleFactor = stage.scale.x;
    const { x, y } = stage.position;

    const nx = clamp(x + dx, [MEM_WIDTH * (1 - scaleFactor), 0]);
    const ny = clamp(y + dy, [MEM_HEIGHT * (1 - scaleFactor), 0]);

    stage.position.set(nx, ny);
  }

  scaleViewport(delta: number) {
    const stage = this.application.stage;
    const scaleFactor = stage.scale.x;

    const nf = Math.max(scaleFactor + delta, 1);

    stage.scale.set(nf, nf);

    this.moveViewport(0, 0); // Recalibrate viewport to avoid out of bounds when unzooming
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
    const cellOwners = new Uint8Array(
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

      const player =
        cellOwner === 255 ? UNOWNED_COLORS : ctx.players[cellOwner];
      // const valueAlpha = valueTint > 0x888888 ? 0.7 : 1.0;

      this.cells[i].update(
        player.contrastColor === "dark"
          ? this.valueTexturesDark[cellValue]
          : this.valueTexturesLight[cellValue],
        cellOwner,
        cellAge,
        pcCount,
        player.color,
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
    value.x = (BYTE_WIDTH - BYTE_WIDTH / 1.5) / 2 - 1;
    value.y = (BYTE_HEIGHT - BYTE_HEIGHT / 1.5) / 2 + 1;
    value.width = BYTE_WIDTH / 1.5;
    value.height = BYTE_HEIGHT / 1.5;

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
