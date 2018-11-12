import * as PIXI from 'pixi.js'

import { Memory, DecodeResult } from './corewar'
import { Player } from './virtual_machine'

// @ts-ignore
import cells from './assets/cells.png'

PIXI.utils.skipHello()

const MAX_CELL_AGE = 1024
const MAX_INSTRUCTION_SIZE = 11 // op + pcb + 2 32bit directs + 1 register
const MEM_SIZE = 4096
const BYTE_WIDTH = 18
const BYTE_HEIGHT = 13
const ROWS = 64
const COLUMNS = 64
const X_SPACING = 2
const Y_SPACING = 1

export const MARGIN = 5
export const MEM_WIDTH = (BYTE_WIDTH + X_SPACING) * COLUMNS + (MARGIN - X_SPACING)
export const MEM_HEIGHT = (BYTE_HEIGHT + Y_SPACING) * ROWS + (MARGIN - Y_SPACING)

interface RendererSetup {
  canvas: HTMLCanvasElement
  onCellClicked: (idx: number) => void
  onLoad: () => void
}

interface RenderContext {
  memory: Memory
  selection: { decoded: DecodeResult; idx: number } | null
  playersById: Map<number, Player>
}

export class PIXIRenderer {
  application: PIXI.Application
  cells: Cell[] = []
  selectionSprites: PIXI.Sprite[] = []
  cellTextures: PIXI.Texture[] = []

  constructor(setup: RendererSetup) {
    const app = new PIXI.Application({
      view: setup.canvas,
      width: MEM_WIDTH,
      height: MEM_HEIGHT,
      backgroundColor: 0x000000
    })
    // Stop the automatic rendering since we do not continuously update
    app.stop()

    app.loader.add(cells).load(() => this.load(setup))

    this.application = app
  }

  load(setup: RendererSetup) {
    const cellSheet = PIXI.utils.TextureCache[cells] as PIXI.Texture

    for (let i = 0; i <= 0xff; ++i) {
      const [x, y] = cellPos(i)

      const frame = new PIXI.Rectangle(
        x * BYTE_WIDTH,
        y * BYTE_HEIGHT,
        BYTE_WIDTH,
        BYTE_HEIGHT
      )
      cellSheet.frame = frame

      this.cellTextures.push(cellSheet.clone())
    }

    for (let i = 0; i < MEM_SIZE; ++i) {
      const [x, y] = cellPos(i)

      const cell = new Cell(x, y)
      cell.valueSprite.on('pointerdown', () => setup.onCellClicked(i))

      this.cells.push(cell)
      this.application.stage.addChild(cell.valueSprite)
    }

    for (let i = 0; i < MAX_INSTRUCTION_SIZE; ++i) {
      let sprite = new PIXI.Sprite(PIXI.Texture.WHITE)
      sprite.tint = 0xff0000
      sprite.alpha = 0.4
      sprite.width = BYTE_WIDTH
      sprite.height = BYTE_HEIGHT

      this.selectionSprites.push(sprite)
      this.application.stage.addChild(sprite)
    }

    setup.onLoad()
  }

  update(ctx: RenderContext) {
    const cellValues = new Uint8Array(
      wasm_bindgen.wasm.memory.buffer,
      ctx.memory.values_ptr,
      MEM_SIZE
    )
    const cellAges = new Uint16Array(
      wasm_bindgen.wasm.memory.buffer,
      ctx.memory.ages_ptr,
      MEM_SIZE
    )
    const cellOwners = new Int32Array(
      wasm_bindgen.wasm.memory.buffer,
      ctx.memory.owners_ptr,
      MEM_SIZE
    )
    const pcCounts = new Uint32Array(
      wasm_bindgen.wasm.memory.buffer,
      ctx.memory.pc_count_ptr,
      MEM_SIZE
    )

    for (let i = 0; i < MEM_SIZE; ++i) {
      const cellValue = cellValues[i]
      const cellOwner = cellOwners[i]
      const cellAge = cellAges[i]
      const pcCount = pcCounts[i]

      let player = ctx.playersById.get(cellOwner)
      let color = player !== undefined ? player.color : 0x404040

      this.cells[i].update(
        this.cellTextures[cellValue],
        cellOwner,
        cellAge,
        pcCount,
        color
      )
    }

    const selectionLength = ctx.selection ? ctx.selection.decoded.byte_size() : 0
    const selectionStartIdx = ctx.selection ? ctx.selection.idx : 0
    const selectionToShow = this.selectionSprites.slice(0, selectionLength)
    const selectionToHide = this.selectionSprites.slice(selectionLength)

    selectionToShow.forEach((spr, offset) => {
      const [x, y] = cellPos(selectionStartIdx + offset)

      spr.visible = true
      spr.x = MARGIN + x * (BYTE_WIDTH + X_SPACING) - X_SPACING
      spr.y = MARGIN + y * (BYTE_HEIGHT + Y_SPACING) - Y_SPACING
    })
    selectionToHide.forEach(spr => (spr.visible = false))

    this.application.render()
  }
}

class Cell {
  valueSprite: PIXI.Sprite
  pcSprite: PIXI.Sprite
  ageSprite: PIXI.Sprite

  constructor(x: number, y: number) {
    const valueSprite = new PIXI.Sprite()
    valueSprite.x = MARGIN + x * (BYTE_WIDTH + X_SPACING)
    valueSprite.y = MARGIN + y * (BYTE_HEIGHT + Y_SPACING)
    valueSprite.interactive = true

    const pcSprite = new PIXI.Sprite(PIXI.Texture.WHITE)
    pcSprite.width = BYTE_WIDTH
    pcSprite.height = BYTE_HEIGHT
    pcSprite.x = -X_SPACING
    pcSprite.y = -Y_SPACING

    const ageSprite = new PIXI.Sprite(PIXI.Texture.WHITE)
    ageSprite.width = BYTE_WIDTH
    ageSprite.height = BYTE_HEIGHT
    ageSprite.x = -X_SPACING
    ageSprite.y = -Y_SPACING

    valueSprite.addChild(pcSprite, ageSprite)

    this.valueSprite = valueSprite
    this.pcSprite = pcSprite
    this.ageSprite = ageSprite
  }

  update(
    valueTexture: PIXI.Texture,
    owner: number,
    age: number,
    pcCount: number,
    color: number
  ) {
    const pcAlpha = pcCount !== 0 ? 0.5 + (pcCount - 1) * 0.05 : 0
    const ageAlpha = owner !== 0 ? 0.35 * (age / MAX_CELL_AGE) : 0

    this.valueSprite.texture = valueTexture
    this.valueSprite.tint = color
    this.pcSprite.alpha = pcAlpha
    this.ageSprite.tint = color
    this.ageSprite.alpha = ageAlpha
  }
}

function cellPos(cellIdx: number): [number, number] {
  const x = cellIdx % COLUMNS
  const y = Math.floor(cellIdx / COLUMNS)

  return [x, y]
}
