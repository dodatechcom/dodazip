import React from 'react'
import { IconCheck, IconX } from './Icons'

interface MessageProps {
  text: string
  type: 'info' | 'success' | 'error'
}

export const Message: React.FC<MessageProps> = ({ text, type }) => {
  const cls = type === 'success' ? 'message-success' : type === 'error' ? 'message-error' : ''
  return (
    <div className={`message ${cls}`}>
      {type === 'success' && <span style={{ marginRight: 6, flexShrink: 0, display: 'inline-flex' }}><IconCheck size={14} /></span>}
      {type === 'error' && <span style={{ marginRight: 6, flexShrink: 0, display: 'inline-flex' }}><IconX size={14} /></span>}
      <span>{text}</span>
    </div>
  )
}
