import * as React from 'react'
import { render } from 'react-dom'
import FlexLayout, { Layout, TabNode, Model } from 'flexlayout-react'
import { observer } from 'mobx-react'

import { Editor } from './editor'
import { VM } from './vm'
import { state, ObservableVM } from './state'

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
        type: 'row',
        weight: 30,
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
                  championId: initialVm.nextChampionId()
                }
              }
            ]
          },
          {
            type: 'tabset',
            weight: 50,
            selected: 0,
            location: 'bottom',
            children: [
              {
                type: 'tab',
                name: 'champion 2',
                component: PaneComponent.Editor,
                config: {
                  vmId: initialVmId,
                  championId: initialVm.nextChampionId()
                }
              }
            ]
          }
        ]
      },
      {
        type: 'tabset',
        weight: 70,
        selected: 0,
        children: [
          {
            type: 'tab',
            name: 'vm 1',
            enableClose: false,
            component: PaneComponent.VM,
            config: {
              vmId: initialVmId
            }
          }
        ]
      }
    ]
  }
}

@observer
class App extends React.Component {
  state = {
    model: (() => {
      const savedLayout = localStorage.getItem('corewar-layout')
      const layout = savedLayout ? JSON.parse(savedLayout) : json
      return FlexLayout.Model.fromJson(layout)
    })()
  }
  layoutRef = React.createRef<Layout>()

  factory(node: TabNode) {
    const component = node.getComponent()
    const config = node.getConfig()
    switch (component) {
      case PaneComponent.Editor:
        const vm = state.getVm(config.vmId) as ObservableVM
        return (
          <Editor
            onCodeChanged={champion => {
              const vm = state.getVm(config.vmId)
              if (vm) vm.setChampionCode(config.championId, champion)
            }}
            onClosed={() => {
              const vm = state.getVm(config.vmId)
              if (vm) vm.removeChampion(config.championId)
            }}
            championColors={vm.colors}
            championId={config.championId}
          />
        )
      case PaneComponent.VM:
        const vmm = state.getVm(config.vmId) as ObservableVM
        return (
          <VM
            vm={vmm}
            onNewChampionRequested={championId =>
              this.onNewChampionRequested(vmm.id, championId)
            }
          />
        )
    }
    return null
  }

  onNewChampionRequested(vmId: number, championId: number) {
    const layout = this.layoutRef.current
    if (layout) {
      layout.addTabWithDragAndDropIndirect(
        'Add panel<br>(Drag to location)',
        {
          component: PaneComponent.Editor,
          name: `Champion ${championId + 1}`,
          config: { vmId, championId }
        },
        () => {}
      )
    }
  }

  onNewVmRequested() {
    const layout = this.layoutRef.current
    if (layout) {
      const [vmId, vm] = state.newVm()
      layout.addTabWithDragAndDropIndirect(
        'Add panel<br>(Drag to location)',
        {
          component: PaneComponent.VM,
          name: `Vm ${vmId + 1}`,
          config: { vm }
        },
        () => {}
      )
    }
  }

  // onRenderTab(tab: TabNode, obj) {
  //   console.log(tab.getName())
  // }

  onModelChange(model: Model) {
    localStorage.setItem('corewar-layout', JSON.stringify(model.toJson()))
  }

  render() {
    return (
      <div>
        <button onClick={this.onNewVmRequested.bind(this)}>New VM</button>
        <Layout
          // onRenderTab={this.onRenderTab.bind(this)}
          onModelChange={this.onModelChange.bind(this)}
          ref={this.layoutRef}
          model={this.state.model}
          factory={this.factory.bind(this)}
        />
      </div>
    )
  }
}

export function start() {
  const $root = document.getElementById('app')
  render(<App />, $root)
}
