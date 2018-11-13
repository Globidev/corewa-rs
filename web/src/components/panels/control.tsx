import * as React from 'react'
import { observer } from 'mobx-react'

import { VirtualMachine } from '../../virtual_machine'

interface IControlPanelProps {
  vm: VirtualMachine
}

@observer
export class ControlPanel extends React.Component<IControlPanelProps> {
  render() {
    const vm = this.props.vm

    const btn = (text: string, onClick: () => void) => (
      <button className="ctrl-btn" onClick={onClick}>
        {text}
      </button>
    )

    return (
      <div style={{ display: 'flex' }}>
        {btn(vm.playing ? '⏸️' : '▶️', () => vm.togglePlay())}
        {btn('⏹️', () => vm.stop())}
        {btn('⏭️', () => vm.step())}
        {btn(`⏩ ${vm.speed}x`, () => vm.nextSpeed())}
      </div>
    )
  }
}
