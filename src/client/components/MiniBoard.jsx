import React, { useEffect, useState } from 'react'

const MiniBoard = ({ playerName }) => {
  const [board, setBoard] = useState(null)

  useEffect(() => {
    const handleSnapshot = (e) => {
      const { playerName: name, board: newBoard } = e.detail
      if (name === playerName) {
        setBoard(newBoard)
      }
    }
    window.addEventListener('board:snapshot', handleSnapshot)
    return () => window.removeEventListener('board:snapshot', handleSnapshot)
  }, [playerName])

  if (!board) return null

  return (
    <div className="mini-board-panel">
      <div className="mini-board-panel__name" title={playerName}>{playerName}</div>
      <div className="mini-board">
        {board.map((row, y) => (
          <React.Fragment key={y}>
            {row.map((val, x) => {
              let className = 'mini-cell--empty'
              if (val === 8) className = 'mini-cell--penalty'
              else if (val > 0) className = 'mini-cell--filled'
              
              const style = val > 0 && val < 8 ? { 
                background: `var(--block-${['I','O','T','S','Z','J','L'][val - 1]})` 
              } : {}

              return <div key={`${y}-${x}`} className={className} style={style} />
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default React.memo(MiniBoard)
