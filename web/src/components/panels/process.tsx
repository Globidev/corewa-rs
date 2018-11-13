import * as React from 'react'
import { observer } from 'mobx-react'

import { VirtualMachine, Player } from '../../virtual_machine'
import { ProcessCollection, ExecutingState } from '../../corewar'
import { toCssColor, titledInfo } from './common'

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
          <details className="pad-left">
            <summary>Registers</summary>
            {Array.from(process.registers()).map((r, i) => (
              <div key={i} className="pad-left">
                {titledInfo(`r${i + 1}`, r)}
              </div>
            ))}
          </details>
        )

        return (
          <details key={i} className="pad-left">
            <summary>PID {process.pid}</summary>
            {titledInfo('Player', coloredPlayerId)},
            {titledInfo('Zero Flag', process.zf.toString())},
            {titledInfo('Last live', process.last_live_cycle)},
            {titledInfo('State', state ? `${state.op()} (${state.cycle_left})` : 'Idle')},
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
