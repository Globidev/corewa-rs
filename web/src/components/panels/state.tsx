import * as React from 'react'
import { observer } from 'mobx-react'

import { VirtualMachine } from '../../virtual_machine'

interface IStatePanelProps {
  vm: VirtualMachine
}

@observer
export class StatePanel extends React.Component<IStatePanelProps> {
  render() {
    const vm = this.props.vm

    if (vm.cycles === null) return null

    const engine = vm.engine

    const cyclesInput = (
      <div className="pad-top" style={{ display: 'flex' }}>
        <div className="info-title">Cycles</div>
        <input
          style={{ textAlign: 'center' }}
          className="cycle-input"
          type="number"
          value={vm.cycles}
          onChange={ev => this.props.vm.setCycle(parseInt(ev.target.value))}
        />
      </div>
    )

    const info = (title: string, value: number) => (
      <div key={title} className="pad-top" style={{ display: 'flex' }}>
        <div className="info-title">{title}</div>
        <div className="code">{value}</div>
      </div>
    )

    return (
      <div>
        {cyclesInput}
        {info('Processes', engine.process_count())}
        {info('Check interval', engine.check_interval())}
        {info(
          'Next check',
          engine.check_interval() - (engine.cycles() - engine.last_live_check())
        )}
        {info('Last check', engine.last_live_check())}
        {info('Live count', engine.live_count_since_last_check())}
        {info('Checks passed', engine.checks_without_cycle_decrement())}
      </div>
    )
  }
}
