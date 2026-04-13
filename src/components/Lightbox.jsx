import { useState, useEffect, useRef, useMemo } from 'react'
import {
  X, ChevronLeft, ChevronRight, Heart, Download, Share2, Maximize2,
  ZoomIn, ZoomOut
} from 'lucide-react'

// ─── Lightbox ─────────────────────────────────────────────────────────────────
const Lightbox = ({
  photo, photos, onClose, onNext, onPrev, onDelete,
  onToggleFavorite, onDownload, onCopyLink, addToast
}) => {
  const [zoom, setZoom] = useState(1)
  const [showInfo, setShowInfo] = useState(false)
  const [heartAnim, setHeartAnim] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const imgRef = useRef(null)
  const containerRef = useRef(null)

  // Touch swipe state
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const dragDeltaX = useRef(0)
  const dragDeltaY = useRef(0)
  const pinchStartDist = useRef(null)

  const info = useMemo(() => {
    if (!photo) return null
    return {
      resolution: photo.width && photo.height ? `${photo.width} × ${photo.height}` : '—',
      fileSize: photo.fileSize
        ? photo.fileSize < 1024 * 1024
          ? `${(photo.fileSize / 1024).toFixed(0)} KB`
          : `${(photo.fileSize / 1024 / 1024).toFixed(1)} MB`
        : '—',
      date: photo.createdAt
        ? new Date(photo.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
          })
        : '—',
    }
  }, [photo])

  // Keyboard handler
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onNext()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      if (e.key === 'd' || e.key === 'D') onDownload(photo)
      if (e.key === 's' || e.key === 'S') triggerFavorite()
      if (e.key === 'c' || e.key === 'C') onCopyLink(photo, addToast)
      if (e.key === '+' || e.key === '=') handleZoomIn()
      if (e.key === '-') handleZoomOut()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, onNext, onPrev, photo, onDownload, addToast])

  // Reset on photo change
  useEffect(() => { setZoom(1); setShowControls(true) }, [photo?.id])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.5, 4))
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.5, 0.5))
  const toggleZoom = () => setZoom(z => z > 1 ? 1 : 2)

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.3 : 0.3
    setZoom(z => Math.max(0.5, Math.min(4, z + delta)))
  }

  const triggerFavorite = () => {
    onToggleFavorite(photo.id)
    setHeartAnim(true)
    setTimeout(() => setHeartAnim(false), 350)
  }

  // Pinch zoom
  const getPinchDist = (e) => Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX,
    e.touches[0].clientY - e.touches[1].clientY
  )

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchStartDist.current = getPinchDist(e)
    } else if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      dragDeltaX.current = 0
      dragDeltaY.current = 0
      setIsDragging(true)
    }
  }

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStartDist.current !== null) {
      e.preventDefault()
      const dist = getPinchDist(e)
      const scale = dist / pinchStartDist.current
      setZoom(z => Math.max(0.5, Math.min(4, z * scale)))
    } else if (e.touches.length === 1 && isDragging && zoom <= 1) {
      dragDeltaX.current = e.touches[0].clientX - touchStartX.current
      dragDeltaY.current = e.touches[0].clientY - touchStartY.current
    }
  }

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      if (zoom <= 1 && Math.abs(dragDeltaX.current) > 60) {
        if (dragDeltaX.current > 0) onPrev()
        else onNext()
      }
      if (zoom <= 1 && dragDeltaY.current > 80 && Math.abs(dragDeltaX.current) < 40) {
        onClose()
      }
      setIsDragging(false)
      dragDeltaX.current = 0
      dragDeltaY.current = 0
    }
    if (e.touches.length < 2) pinchStartDist.current = null
  }

  const currentIndex = photos.findIndex(p => p.id === photo?.id)

  // Transform for swipe drag
  const dragTransform = isDragging && zoom <= 1
    ? `translate(${dragDeltaX.current}px, ${dragDeltaY.current * 0.3}px)`
    : 'translate(0, 0)'

  const dragOpacity = isDragging && zoom <= 1
    ? 1 - Math.abs(dragDeltaX.current) / 400
    : 1

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center animate-fade-in lb-backdrop"
      ref={containerRef}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 transition-all duration-200"
        style={{
          background: showControls ? 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' : 'transparent',
          opacity: showControls ? 1 : 0
        }}
      >
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center text-white-70 rounded transition-colors duration-100"
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <X size={20} />
        </button>

        <div className="flex items-center px-2.5 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
          {currentIndex + 1} / {photos.length}
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={triggerFavorite}
            className="w-11 h-11 flex items-center justify-center rounded transition-colors duration-100"
            style={{ color: photo.isFavorite ? '#FBBF24' : 'rgba(255,255,255,0.7)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <Heart size={18} fill={photo.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-11 h-11 flex items-center justify-center rounded transition-colors duration-100"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            title="Zoom out (-)"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={toggleZoom}
            className="w-11 h-11 flex items-center justify-center rounded transition-colors duration-100 min-w-[44px]"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            title="Toggle zoom"
          >
            <span className="text-xs font-medium">{Math.round(zoom * 100)}%</span>
          </button>
          <button
            onClick={handleZoomIn}
            className="w-11 h-11 flex items-center justify-center rounded transition-colors duration-100"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            title="Zoom in (+)"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => onDownload(photo)}
            className="w-11 h-11 flex items-center justify-center rounded transition-colors duration-100"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => onCopyLink(photo, addToast)}
            className="w-11 h-11 flex items-center justify-center rounded transition-colors duration-100"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <Share2 size={18} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-11 h-11 flex items-center justify-center rounded transition-colors duration-100"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Nav arrows */}
      {currentIndex > 0 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full lb-nav-btn transition-all duration-100"
          style={{ opacity: showControls ? 1 : 0 }}
          onClick={e => { e.stopPropagation(); onPrev() }}
        >
          <ChevronLeft size={24} style={{ color: 'rgba(255,255,255,0.8)' }} />
        </button>
      )}
      {currentIndex < photos.length - 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full lb-nav-btn transition-all duration-100"
          style={{ opacity: showControls ? 1 : 0 }}
          onClick={e => { e.stopPropagation(); onNext() }}
        >
          <ChevronRight size={24} style={{ color: 'rgba(255,255,255,0.8)' }} />
        </button>
      )}

      {/* Image area */}
      <div
        className="relative flex items-center justify-center w-full h-full overflow-hidden px-4 py-20"
        onClick={e => { if (zoom <= 1) setShowControls(s => !s) }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{ cursor: zoom > 1 ? 'zoom-out' : 'pointer' }}
      >
        <div
          className="animate-lb-open"
          style={{
            transform: dragTransform,
            opacity: dragOpacity,
            transition: isDragging ? 'none' : 'transform 200ms ease-out, opacity 200ms ease-out'
          }}
          onClick={e => { e.stopPropagation(); toggleZoom() }}
        >
          <img
            ref={imgRef}
            src={photo.dataUrl}
            alt={photo.note || 'Photo'}
            className="max-w-full max-h-full object-contain rounded"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              maxHeight: 'calc(100vh - 160px)',
              userSelect: 'none'
            }}
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom info bar */}
      {(photo.note || showInfo) && (
        <div
          className="absolute bottom-0 left-0 right-0 px-4 py-4 transition-all duration-200"
          style={{
            background: showControls ? 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' : 'transparent',
            opacity: showControls ? 1 : 0
          }}
          onClick={e => e.stopPropagation()}
        >
          {photo.note && (
            <p className="text-sm text-white-80 text-center max-w-lg mx-auto leading-relaxed mb-1">
              {photo.note}
            </p>
          )}
          <p className="text-xs text-white-40 text-center">
            {info.resolution} · {info.fileSize} · {info.date}
          </p>
        </div>
      )}
    </div>
  )
}

export default Lightbox
