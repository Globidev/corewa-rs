import * as React from 'react'
import { render } from 'react-dom'
import FlexLayout, { TabNode } from 'flexlayout-react'
import { observer } from 'mobx-react'

import { Editor } from './editor'
import { VM } from './vm'
import { state, uiState } from './state'

const enum PaneComponent {
  Editor = 'editor',
  VM = 'vm'
}

const [initialVmId, initialVm] = state.newVm()

var json = {
  global: {},
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'tabset',
        weight: 50,
        selected: 0,
        children: [
          {
            type: 'tab',
            name: 'champion 1',
            component: PaneComponent.Editor,
            config: {
              vmId: initialVmId,
              championId: 0
            }
          }
        ]
      },
      {
        type: 'tabset',
        weight: 50,
        selected: 0,
        children: [
          {
            type: 'tab',
            name: 'champion 2',
            component: PaneComponent.Editor,
            config: {
              vmId: initialVmId,
              championId: 1
            }
          }
        ]
      },
      {
        type: 'tabset',
        weight: 50,
        selected: 0,
        children: [
          {
            type: 'tab',
            name: 'vm 1',
            component: PaneComponent.VM,
            config: {
              vm: initialVm
            }
          }
        ]
      }
    ]
  }
}

@observer
class App extends React.Component {
  state = { model: FlexLayout.Model.fromJson(json) }

  factory(node) {
    const component = node.getComponent()
    const config = node.getConfig()
    switch (component) {
      case PaneComponent.Editor:
        const vmId = config.vmId
        const championId = config.championId
        return (
          <Editor
            onCodeChanged={code => {
              const vm = state.getVm(vmId)
              if (vm) vm.setChampionCode(config.championId, code)
            }}
          />
        )
      case PaneComponent.VM:
        const vm = config.vm
        return <VM vm={vm} />
    }
  }

  onAdd(event) {
    this.refs.layout.addTabWithDragAndDropIndirect(
      'Add panel<br>(Drag to location)',
      {
        component: 'text',
        name: 'added',
        config: { text: 'i was added' }
      },
      null
    )
  }

  render() {
    return (
      <div className="outer">
        <button onClick={this.onAdd.bind(this)}>Add</button>
        <div className="inner">
          <FlexLayout.Layout
            ref="layout"
            model={this.state.model}
            factory={this.factory.bind(this)}
          />
        </div>
      </div>
    )
  }
}

export function start() {
  const $root = document.getElementById('app')
  render(<App />, $root)
}
