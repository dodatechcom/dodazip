import React from 'react'

interface ProgressBarProps {
  progress: number
  label?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label }) => (
  <div style={{ marginTop: 12 }}>
    {label && (
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
        <span>{label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
    )}
    <div className="progress-bar">
      <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
    </div>
  </div>
)
