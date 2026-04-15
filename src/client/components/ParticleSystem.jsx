import React, { useEffect, useState, useRef } from 'react'

const PIECE_COLORS = ['#00FFFF','#FFFF00','#9C27B0','#4CAF50','#F44336','#2196F3','#FF9800']

const createParticles = (rowY, count = 20) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${rowY}-${i}-${Date.now()}-${Math.random()}`,
    x: Math.random() * 100, // percentage string
    y: (rowY / 20) * 100,   // percentage within board
    vx: (Math.random() - 0.5) * 1,
    vy: -Math.random() * 1.5 - 0.5,
    color: PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)],
    life: 1,
    size: Math.random() * 6 + 4,
  }))

const ParticleSystem = ({ clearingRows }) => {
  const [particles, setParticles] = useState([])
  const requestRef = useRef()
  const lastTimeRef = useRef()

  useEffect(() => {
    if (clearingRows && clearingRows.length > 0) {
      const newParticles = clearingRows.flatMap(y => createParticles(y, 40))
      setParticles(p => [...p, ...newParticles])
    }
  }, [clearingRows])

  const updateParticles = time => {
    if (lastTimeRef.current != null) {
      const deltaTime = time - lastTimeRef.current
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx * (deltaTime / 16),
        y: p.y + p.vy * (deltaTime / 16),
        life: p.life - deltaTime * 0.002,
      })).filter(p => p.life > 0))
    }
    lastTimeRef.current = time
    requestRef.current = requestAnimationFrame(updateParticles)
  }

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateParticles)
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current) }
  }, [])

  if (particles.length === 0) return null

  return (
    <div style={{
      position: 'absolute',
      pointerEvents: 'none',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 50,
      overflow: 'hidden'
    }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          background: p.color,
          opacity: p.life,
          borderRadius: '50%',
          boxShadow: `0 0 10px ${p.color}`,
          transform: `translateZ(30px) scale(${p.life})`
        }} />
      ))}
    </div>
  )
}

export default React.memo(ParticleSystem)
