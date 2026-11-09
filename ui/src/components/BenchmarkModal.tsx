import React, { useState } from 'react'
import { safeInvoke as invoke } from '../utils/tauriBridge'
import { IconCpu, IconSpeed, IconRefresh, IconX, IconLoader } from './Icons'

interface BenchmarkResult {
  cpu_brand: String
  cpu_cores: number
  data_size_mb: number
  compress_speed_mbs: number
  decompress_speed_mbs: number
  compress_ratio: number
  hash_speed_mbs: number
  rating_score: number
}

interface BenchmarkModalProps {
  isOpen: boolean
  onClose: () => void
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({ isOpen, onClose }) => {
  const [dataSizeMb, setDataSizeMb] = useState<number>(32)
  const [running, setRunning] = useState<boolean>(false)
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleRun = async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await invoke<BenchmarkResult>('run_benchmark', { dataSizeMb })
      setResult(res)
    } catch (err: any) {
      setError(String(err))
    } finally {
      setRunning(false)
    }
  }

  const getRatingBadge = (score: number) => {
    if (score >= 20000) return { label: 'Ultra High Performance', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' }
    if (score >= 10000) return { label: 'Very Fast', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' }
    if (score >= 5000) return { label: 'Good Performance', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' }
    return { label: 'Standard', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)' }
  }

  return (
    <div className="modal-backdrop-acrylic" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-window-modern"
        style={{ maxWidth: 620, width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-win-header">
          <div className="modal-win-title">
            <div
              className="modal-win-icon-badge"
              style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}
            >
              <IconSpeed size={22} />
            </div>
            <div>
              <span className="modal-win-title-text" style={{ fontSize: 16 }}>
                CPU & Compression Benchmark
              </span>
              <span className="modal-win-subtitle" style={{ fontSize: 12, marginTop: 2 }}>
                Measure multi-core compression, decompression, and BLAKE3 hashing speed
              </span>
            </div>
          </div>
          <button className="modal-win-close-btn" onClick={onClose} title="Close">
            <IconX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-win-body" style={{ gap: 16, padding: '16px 20px' }}>
          {/* Controls Bar: Size selector & Run button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-main, #f8fafc)',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-light, #e2e8f0)',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                Test Buffer Size:
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[16, 32, 64].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setDataSizeMb(size)}
                    disabled={running}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: running ? 'not-allowed' : 'pointer',
                      border: dataSizeMb === size ? '1px solid #2563eb' : '1px solid var(--border-light)',
                      background: dataSizeMb === size ? '#2563eb' : 'var(--bg-card, #ffffff)',
                      color: dataSizeMb === size ? '#ffffff' : 'var(--text-primary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {size} MB
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="dialog-btn dialog-btn-primary"
              onClick={handleRun}
              disabled={running}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                fontSize: 13,
                fontWeight: 600,
                background: running ? 'var(--text-muted)' : '#2563eb',
                cursor: running ? 'not-allowed' : 'pointer',
              }}
            >
              {running ? (
                <>
                  <span className="spin-loader" style={{ display: 'inline-flex' }}><IconLoader size={14} /></span>
                  <span>Benchmarking...</span>
                </>
              ) : (
                <>
                  <IconRefresh size={14} />
                  <span>{result ? 'Run Again' : 'Start Benchmark'}</span>
                </>
              )}
            </button>
          </div>

          {/* Running State Notice */}
          {running && (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                background: 'rgba(37, 99, 235, 0.04)',
                border: '1px dashed #3b82f6',
                borderRadius: 8,
              }}
            >
              <div style={{ marginBottom: 8, color: '#2563eb' }}>
                <span className="spin-loader" style={{ display: 'inline-block' }}><IconSpeed size={32} /></span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Benchmarking CPU & Memory Throughput...</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Saturating all logical CPU cores with multi-threaded Zstd & BLAKE3 pipeline.
              </div>
            </div>
          )}

          {/* Error Notice */}
          {error && !running && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontSize: 13,
              }}
            >
              Error running benchmark: {error}
            </div>
          )}

          {/* Benchmark Results Display */}
          {result && !running && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* CPU Specs Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--bg-main, #f8fafc)',
                  border: '1px solid var(--border-light, #e2e8f0)',
                }}
              >
                <div style={{ color: '#2563eb' }}><IconCpu size={24} /></div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {result.cpu_brand || 'Host Processor'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {result.cpu_cores} Logical Cores / Threads &bull; {result.data_size_mb} MB Sample Data
                  </div>
                </div>
                {result.rating_score > 0 && (
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700,
                      ...getRatingBadge(result.rating_score),
                    }}
                  >
                    {getRatingBadge(result.rating_score).label}
                  </div>
                )}
              </div>

              {/* 4 Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {/* 1. Multi-core Compression */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 8,
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                      Zstd Compression
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', background: 'rgba(37, 99, 235, 0.08)', padding: '2px 6px', borderRadius: 4 }}>
                      Balanced
                    </span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
                    {result.compress_speed_mbs.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>MB/s</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Ratio: <strong>{result.compress_ratio}x</strong> ({Math.round((1 - 1 / result.compress_ratio) * 100)}% space saved)
                  </div>
                </div>

                {/* 2. Multi-core Decompression */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 8,
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                      Zstd Decompression
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '2px 6px', borderRadius: 4 }}>
                      Parallel
                    </span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
                    {result.decompress_speed_mbs.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>MB/s</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Multi-stream parallel inflation throughput
                  </div>
                </div>

                {/* 3. BLAKE3 Hashing */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 8,
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                      BLAKE3 Checksum Hash
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.08)', padding: '2px 6px', borderRadius: 4 }}>
                      SIMD/AVX
                    </span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
                    {result.hash_speed_mbs.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>MB/s</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Tree hashing with cryptographic security
                  </div>
                </div>

                {/* 4. Overall Rating Score */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 8,
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                      Overall Rating
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)', padding: '2px 6px', borderRadius: 4 }}>
                      DodaScore
                    </span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb', marginTop: 6 }}>
                    {result.rating_score.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>MIPS</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Multi-core compression rating benchmark
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Initial Blank State (Before First Run) */}
          {!result && !running && !error && (
            <div
              style={{
                padding: '30px 20px',
                textAlign: 'center',
                background: 'var(--bg-main, #f8fafc)',
                border: '1px solid var(--border-light, #e2e8f0)',
                borderRadius: 8,
              }}
            >
              <div style={{ color: 'var(--text-muted)', marginBottom: 10 }}>
                <IconSpeed size={36} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Ready to Benchmark
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 400, margin: '6px auto 16px' }}>
                Click <strong>"Start Benchmark"</strong> to evaluate your CPU's multi-core compression speed, decompression throughput, and BLAKE3 hash rate.
              </div>
              <button
                type="button"
                className="dialog-btn dialog-btn-primary"
                onClick={handleRun}
                style={{ padding: '8px 24px', fontSize: 13, fontWeight: 600 }}
              >
                Start Benchmark
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-win-footer" style={{ justifyContent: 'flex-end', padding: '12px 20px' }}>
          <button
            type="button"
            className="dialog-btn dialog-btn-secondary"
            onClick={onClose}
            style={{ padding: '6px 18px', fontSize: 13 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
