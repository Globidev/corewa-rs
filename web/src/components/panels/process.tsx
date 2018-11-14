import * as React from 'react'
import { observer } from 'mobx-react'

import { VirtualMachine, Player } from '../../virtual_machine'
import { ProcessCollection, ExecutingState } from '../../corewar'
import { toCssColor, Info } from './common'

const MAX_PROCESS_DISPLAYED = 32

interface IProcessPanelProps {
  processes: ProcessCollection
  vm: VirtualMachine
}

@observer
export class ProcessPanel extends React.Component<IProcessPanelProps> {
  render() {
    const processes = this.props.processes
    const len = processes.len()

    const details = Array(Math.min(len, MAX_PROCESS_DISPLAYED))
      .fill(0)
      .map((_, i) => {
        const process = processes.at(i)
        const state = process.executing() as ExecutingState | null
        const playerColor = (this.props.vm.playersById.get(process.player_id) as Player)
          .color

        const coloredPlayerId = (
          <div
            style={{
              backgroundColor: toCssColor(playerColor)
            }}
          >
            {process.player_id}
          </div>
        )

        const registers = (
          <details>
            <summary>Registers</summary>
            {Array.from(process.registers()).map((r, i) => (
              <Info title={`r${i + 1}`} minWidth={50}>
                {r}
              </Info>
            ))}
          </details>
        )

        return (
          <details key={i} className="pad-left">
            <summary>PID {process.pid}</summary>
            <Info title="Player">{coloredPlayerId}</Info>
            <Info title="Zero Flag">{process.zf.toString()}</Info>
            <Info title="Last live">{process.last_live_cycle}</Info>
            <Info title="State">
              {state ? `${state.op()} (${state.cycle_left})` : 'Idle'}
            </Info>
            {registers}
          </details>
        )
      })

    return len == 0 ? null : (
      <div>
        <details>
          <summary>
            {len} process
            {len >= 2 ? 'es' : ''}
          </summary>
          {details}
        </details>
      </div>
    )
  }
}
