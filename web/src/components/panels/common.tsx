import * as React from 'react'

export function toCssColor(color: number) {
  color >>>= 0
  const b = color & 0xff,
    g = (color & 0xff00) >>> 8,
    r = (color & 0xff0000) >>> 16
  return `rgb(${r}, ${g}, ${b})`
}

export function titledInfo(title: string, value: any) {
  return (
    <div className="pad-top" style={{ display: 'flex' }}>
      <div className="pad-left" style={{ minWidth: '80px' }}>
        {title}
      </div>
      <div className="code">{value}</div>
    </div>
  )
}
