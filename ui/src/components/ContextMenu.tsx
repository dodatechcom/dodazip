import React, { useEffect, useRef } from 'react'

export interface ContextMenuItem {
  label: string
  action: () => void
  disabled?: boolean
  separator?: boolean
  shortcut?: string
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') onClose()
        return
      }
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener('mousedown', handle)
    window.addEventListener('keydown', handle)
    return () => {
      window.removeEventListener('mousedown', handle)
      window.removeEventListener('keydown', handle)
    }
  }, [onClose])

  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width - 8
    const maxY = window.innerHeight - rect.height - 8
    if (x > maxX) ref.current.style.left = `${maxX}px`
    if (y > maxY) ref.current.style.top = `${maxY}px`
  })

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="context-menu-separator" />
        }
        return (
          <button
            key={i}
            className={`context-menu-item ${item.danger ? 'context-menu-item-danger' : ''}`}
            style={item.danger ? { color: '#ef4444' } : undefined}
            disabled={item.disabled}
            onClick={() => { item.action(); onClose() }}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
          </button>
        )
      })}
    </div>
  )
}
