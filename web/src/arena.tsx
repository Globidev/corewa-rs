import * as PIXI from 'pixi.js'
import * as React from 'react'
import { Memory, DecodeResult } from './corewar'

const MEM_SIZE = 4096
const BYTE_WIDTH = 18
const BYTE_HEIGHT = 13
const ROWS = 64
const COLUMNS = 64
const X_SPACING = 2
const Y_SPACING = 1
const MARGIN = 5
const MEM_WIDTH = (BYTE_WIDTH + X_SPACING) * COLUMNS + (MARGIN - X_SPACING)
const MEM_HEIGHT = (BYTE_HEIGHT + Y_SPACING) * ROWS + (MARGIN - Y_SPACING)
const MAX_CELL_AGE = 1024

interface RenderContext {
  memory: Memory
  selection: { decoded: DecodeResult; idx: number } | null
  colorsById: Map<number, number>
}

interface IArenaProps {
  onCellClicked: (idx: number) => void
}

export class Arena extends React.Component<IArenaProps> {
  canvasRef = React.createRef<HTMLCanvasElement>()
  application: PIXI.Application | null = null
  cells: Cell[] = []
  selectionSprites: PIXI.Sprite[] = []

  componentDidMount() {
    const canvas = this.canvasRef.current

    if (canvas) {
      this.application = new PIXI.Application({
        view: canvas,
        width: MEM_WIDTH,
        height: MEM_HEIGHT,
        backgroundColor: 0x000000
      })
      // Stop the automatic rendering since we do not continuously update
      this.application.stop()

      for (let i = 0; i < MEM_SIZE; ++i) {
        const x = i % COLUMNS
        const y = Math.floor(i / COLUMNS)

        const cell = new Cell(x, y)
        cell.container.on('pointerdown', () => {
          this.props.onCellClicked(i)
        })

        this.cells.push(cell)
        this.application.stage.addChild(cell.container)
      }
    }
  }

  render() {
    return (
      <canvas
        ref={this.canvasRef}
        id="canvas"
        width={MEM_WIDTH}
        height={MEM_HEIGHT}
        style={{
          margin: `${MARGIN}px ${MARGIN}px ${MARGIN}px ${MARGIN}px`,
          maxHeight: `${MEM_HEIGHT}px`,
          maxWidth: `${MEM_WIDTH}px`
        }}
      />
    )
  }

  update(ctx: RenderContext) {
    const app = this.application

    if (app === null) return

    // console.time('update cells')
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

      let color = cellOwner !== 0 ? (ctx.colorsById.get(cellOwner) as number) : 0xffffff30

      this.cells[i].update(cellValue, cellOwner, cellAge, pcCount, color)
    }

    for (let sprite of this.selectionSprites) {
      app.stage.removeChild(sprite)
    }

    this.selectionSprites = []

    if (ctx.selection) {
      for (let i = 0; i < ctx.selection.decoded.byte_size(); ++i) {
        const idx = ctx.selection.idx + i
        const x = idx % COLUMNS
        const y = Math.floor(idx / COLUMNS)

        let sprite = new PIXI.Sprite(PIXI.Texture.WHITE)
        sprite.tint = 0xff0000
        sprite.alpha = 0.4
        sprite.width = BYTE_WIDTH
        sprite.height = BYTE_HEIGHT
        sprite.x = MARGIN + x * (BYTE_WIDTH + X_SPACING) - X_SPACING
        sprite.y = MARGIN + y * (BYTE_HEIGHT + Y_SPACING) - Y_SPACING

        this.selectionSprites.push(sprite)
        app.stage.addChild(sprite)
      }
    }
    // console.timeEnd('update cells')

    // console.time('render')
    app.render()
    // console.timeEnd('render')
  }
}

class Cell {
  valueText: PIXI.Text
  pcSprite: PIXI.Sprite
  ageSprite: PIXI.Sprite
  container: PIXI.Container

  constructor(x: number, y: number) {
    const text = new PIXI.Text('00', {
      fontFamily: 'monospace',
      fontSize: '9pt',
      fontWeight: 'bold',
      lineHeight: BYTE_HEIGHT
    })

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

    const container = new PIXI.Container()
    container.addChild(pcSprite, ageSprite, text)
    container.x = MARGIN + x * (BYTE_WIDTH + X_SPACING)
    container.y = MARGIN + y * (BYTE_HEIGHT + Y_SPACING)
    container.interactive = true

    this.valueText = text
    this.pcSprite = pcSprite
    this.ageSprite = ageSprite
    this.container = container
  }

  update(value: number, owner: number, age: number, pcCount: number, color: number) {
    let byteText = value.toString(16).toUpperCase()
    if (byteText.length < 2) byteText = `0${byteText}`

    const pcAlpha = pcCount !== 0 ? 0.5 + (pcCount - 1) * 0.05 : 0
    const ageAlpha = owner !== 0 ? 0.35 * (age / MAX_CELL_AGE) : 0

    this.valueText.text = byteText
    this.valueText.style.fill = color
    this.pcSprite.alpha = pcAlpha
    this.ageSprite.tint = color
    this.ageSprite.alpha = ageAlpha
  }
}
