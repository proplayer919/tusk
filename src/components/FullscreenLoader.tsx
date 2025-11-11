import React from 'react'
import './FullscreenLoader.css'

const FullscreenLoader: React.FC = () => {
  return (
    <div className="fullscreen-loader" role="status" aria-label="Loading">
      <div className="loader-wrap">
        <div className="spinner" />
        <div className="loader-text">Loading…</div>
      </div>
    </div>
  )
}

export default FullscreenLoader
