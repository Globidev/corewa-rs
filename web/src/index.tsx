import * as React from 'react'
import { render } from 'react-dom'

import { VirtualMachine } from './virtual_machine'
import { CorewarLayout } from './layout'

class App extends React.Component {
  vm = new VirtualMachine()

  render() {
    return <CorewarLayout vm={this.vm} />
  }
}

export function start() {
  const $root = document.getElementById('app')
  render(<App />, $root)
}

// @observer
// class App extends React.Component {
//   state = {
//     model: (() => {
//       const savedLayout = localStorage.getItem('corewar-layout')
//       const layout = savedLayout ? JSON.parse(savedLayout) : json
//       return FlexLayout.Model.fromJson(layout)
//     })()

//   onNewChampionRequested(vmId: number, championId: number) {
//     const layout = this.layoutRef.current
//     if (layout) {
//       layout.addTabWithDragAndDropIndirect(
//         'Add panel<br>(Drag to location)',
//         {
//           component: PaneComponent.Editor,
//           name: `Champion`,
//           config: { vmId, championId }
//         },
//         () => {}
//       )
//     }
//   }

//   onHelpRequested() {
//     const layout = this.layoutRef.current
//     if (layout) {
//       layout.addTabWithDragAndDropIndirect(
//         'Add panel<br>(Drag to location)',
//         {
//           component: PaneComponent.Help,
//           name: `Documentation`
//         },
//         () => {}
//       )
//     }
//   }

//   onNewVmRequested() {
//     const layout = this.layoutRef.current
//     if (layout) {
//       const [vmId, vm] = state.newVm()
//       layout.addTabWithDragAndDropIndirect(
//         'Add panel<br>(Drag to location)',
//         {
//           component: PaneComponent.VM,
//           name: `Vm ${vmId + 1}`,
//           config: { vm }
//         },
//         () => {}
//       )
//     }
//   }

//   // onRenderTab(tab: TabNode, obj) {
//   //   console.log(tab.getName())
//   // }

//   onModelChange(model: Model) {
//     localStorage.setItem('corewar-layout', JSON.stringify(model.toJson()))
//   }

//   render() {
//     return (
//       <div>
//         <button onClick={this.onNewVmRequested.bind(this)}>New VM</button>
//         <Layout
//           // onRenderTab={this.onRenderTab.bind(this)}
//           onModelChange={this.onModelChange.bind(this)}
//           ref={this.layoutRef}
//           model={this.state.model}
//           factory={this.factory.bind(this)}
//         />
//       </div>
//     )
//   }
// }
