import '../public/style.css';

import * as React from 'react'
import { render } from 'react-dom'

import { VirtualMachine } from './virtual_machine'
import { CorewarLayout } from './components/layout'

const App = () => <CorewarLayout vm={new VirtualMachine()} />

export function main() {
  const $root = document.getElementById('app')
  render(<App />, $root)
}
