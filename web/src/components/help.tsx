import * as React from 'react'
import * as Showdown from 'showdown'

import { observable } from 'mobx'
import { observer } from 'mobx-react'

// @ts-ignore
import documentation from '../../README.md'

Showdown.setOption('tables', true)

@observer
export class Help extends React.Component {
  mdBuilder = new Showdown.Converter()
  @observable
  markdown = ''

  constructor(props: {}) {
    super(props)

    fetch(documentation)
      .then(r => r.text())
      .then(md => {
        this.markdown = this.mdBuilder.makeHtml(md)
      })
  }

  render() {
    return (
      <div className="markdown-body">
        <div dangerouslySetInnerHTML={{ __html: this.markdown }} />
      </div>
    )
  }
}
