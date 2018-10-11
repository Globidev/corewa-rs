import * as React from 'react'
import { render } from 'react-dom'
import FlexLayout, { Layout, TabNode } from 'flexlayout-react'
import { observer } from 'mobx-react'

import { Editor } from './editor'
import { VM } from './vm'
import { state } from './state'

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
              championId: initialVm.nextChampionId()
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
              championId: initialVm.nextChampionId()
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
  layoutRef = React.createRef<Layout>()

  factory(node: TabNode) {
    const component = node.getComponent()
    const config = node.getConfig()
    switch (component) {
      case PaneComponent.Editor:
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
          />
        )
      case PaneComponent.VM:
        return (
          <VM
            vm={config.vm}
            onNewChampionRequested={championId =>
              this.onNewChampionRequested(config.vm.id, championId)
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

  // onRenderTab(tab: TabNode, obj) {
  //   tab.getModel().
  // }

  // onModelChange(...x) {
  //   console.log(x)
  // }

  render() {
    return (
      <div className="outer">
        <div className="inner">
          <Layout
            // onRenderTab={this.onRenderTab.bind(this)}
            // onModelChange={this.onModelChange.bind(this)}
            ref={this.layoutRef}
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
