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
