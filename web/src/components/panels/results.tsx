import * as React from 'react'
import { observer } from 'mobx-react'

import { VirtualMachine, Player, MatchResult } from '../../virtual_machine'
import { toCssColor } from './common'

interface IResultsPanelProps {
  result: MatchResult
  vm: VirtualMachine
}

@observer
export class ResultsPanel extends React.Component<IResultsPanelProps> {
  render() {
    const result = this.props.result

    const nameSpans = result.map((p, i) => {
      const playerColor = (this.props.vm.playersById.get(p.id) as Player).color
      const color = toCssColor(playerColor)
      return (
        <span key={i} style={{ color }}>
          {p.champion_name()}
        </span>
      )
    })

    const joinedSpans = [nameSpans[0]]
    let i = 1
    for (; i < nameSpans.length - 1; ++i) {
      joinedSpans.push(<span key={`s${i}`}>, </span>)
      joinedSpans.push(nameSpans[i])
    }
    if (i < nameSpans.length) {
      joinedSpans.push(<span key={`s${i}`}> and </span>)
      joinedSpans.push(nameSpans[i])
    }

    return (
      <div>
        <hr />
        {result.length > 1 ? (
          <div>
            {'Draw between '}
            {joinedSpans}
          </div>
        ) : (
          <div>{joinedSpans} Wins</div>
        )}
      </div>
    )
  }
}
