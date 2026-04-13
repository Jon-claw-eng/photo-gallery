import { useState, useEffect, useRef, useMemo } from 'react'
import {
  X, ChevronLeft, ChevronRight, Heart, Download, Share2, ZoomIn,
  Maximize2, Info
} from 'lucide-react'

// ─── Lightbox ─────────────────────────────────────────────────────────────────
const Lightbox = ({
  photo, photos, onClose, onNext, onPrev, onDelete,
  onToggleFavorite, onDownload, onCopyLink, addToast
}) => {
  const [zoom, setZoom] = useState(1)
  const [showInfo, setShowInfo] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [heartAnim, setHeartAnim] = useState(false)
  const imgRef = useRef(null)
  const containerRef = useRef(null)

  // Touch swipe state
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isDragging = useRef(false)
  const dragDeltaX = useRef(0)

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
      if (e.key === 's' || e.key === 'S') {
        onToggleFavorite(photo.id)
        setHeartAnim(true)
        setTimeout(() => setHeartAnim(false), 350)
      }
      if (e.key === 'c' || e.key === 'C') onCopyLink(photo, addToast)
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 4))
      if (e.key === '-') setZoom(z => Math.max(z - 0.25, 0.5))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, onNext, onPrev, photo, onDownload, onToggleFavorite, onCopyLink, addToast])

  useEffect(() => { setZoom(1); setShowActions(false) }, [photo?.id])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.15 : 0.15
    setZoom(z => Math.max(0.5, Math.min(4, z + delta)))
  }

  // Pinch zoom
  const lastPinchDist = useRef(null)
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      lastPinchDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
    } else if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      isDragging.current = true
      dragDeltaX.current = 0
    }
  }

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const scale = dist / lastPinchDist.current
      setZoom(z => Math.max(0.5, Math.min(4, z * scale)))
      lastPinchDist.current = dist
    } else if (e.touches.length === 1 && isDragging.current && zoom <= 1) {
      dragDeltaX.current = e.touches[0].clientX - touchStartX.current
    }
  }

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      if (zoom <= 1 && Math.abs(dragDeltaX.current) > 50) {
        if (dragDeltaX.current > 0) onPrev()
        else onNext()
      }
      isDragging.current = false
      dragDeltaX.current = 0
    }
    if (e.touches.length < 2) lastPinchDist.current = null
  }

  const currentIndex = photos.findIndex(p => p.id === photo?.id)

  const handleFavorite = () => {
    onToggleFavorite(photo.id)
    setHeartAnim(true)
    setTimeout(() => setHeartAnim(false), 350)
  }

  const containerStyle = zoom <= 1
    ? { transform: `translateX(${dragDeltaX.current}px)`, transition: 'transform 0.1s' }
    : {}

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
      ref={containerRef}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}
      >
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all active:scale-95"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => { onToggleFavorite(photo.id); setHeartAnim(true); setTimeout(() => setHeartAnim(false), 350) }}
            className="w-11 h-11 flex items-center justify-center text-white/70 hover:text-brand rounded-full hover:bg-white/10 transition-all active:scale-95"
          >
            <Heart
              size={18}
              className={photo.isFavorite ? 'text-brand fill-brand animate-heart-bounce' : ''}
            />
          </button>
          <button
            onClick={() => onDownload(photo)}
            className="w-11 h-11 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all active:scale-95"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => onCopyLink(photo, addToast)}
            className="w-11 h-11 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all active:scale-95"
          >
            <Share2 size={18} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-11 h-11 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all active:scale-95"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Nav arrows */}
      {currentIndex > 0 && (
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center text-white/60 hover:text-white rounded-full glass-card transition-all hover:scale-105 active:scale-95"
          onClick={e => { e.stopPropagation(); onPrev() }}
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {currentIndex < photos.length - 1 && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center text-white/60 hover:text-white rounded-full glass-card transition-all hover:scale-105 active:scale-95"
          onClick={e => { e.stopPropagation(); onNext() }}
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Image */}
      <div
        className="relative flex items-center justify-center w-full h-full overflow-hidden px-4 py-16"
        onClick={e => { if (zoom <= 1) setShowActions(s => !s) }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: zoom > 1 ? 'zoom-out' : 'default' }}
      >
        <div
          className="animate-scale-in"
          style={containerStyle}
          onClick={e => { e.stopPropagation(); setZoom(z => z > 1 ? 1 : 2) }}
        >
          <img
            ref={imgRef}
            src={photo.dataUrl}
            alt={photo.note || 'Photo'}
            className="max-w-full max-h-full object-contain rounded-lg"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              maxHeight: 'calc(100vh - 160px)',
            }}
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom bar */}
      {photo.note && (
        <div
          className="absolute bottom-0 left-0 right-0 px-4 py-4"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-sm text-white/90 text-center max-w-lg mx-auto leading-relaxed">
            {photo.note}
          </p>
          <p className="text-xs text-white/40 text-center mt-1">
            {info.resolution} · {info.fileSize} · {info.date}
          </p>
        </div>
      )}

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute bottom-4 right-4 px-2 py-1 rounded-btn glass-card text-xs text-textSecondary">
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  )
}

export default Lightbox
