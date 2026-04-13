import { useState, useEffect, useRef } from 'react'
import { X, FolderPlus, Star, Grid3X3, Trash2, Edit3, Heart } from 'lucide-react'

// ─── useIsMobile ──────────────────────────────────────────────────────────────
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

// ─── BottomSheet ─────────────────────────────────────────────────────────────
export const BottomSheet = ({ isOpen, onClose, children, title }) => {
  const sheetRef = useRef(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  useEffect(() => {
    if (!isOpen) return
    const handleTouchStart = (e) => {
      startY.current = e.touches[0].clientY
    }
    const handleTouchMove = (e) => {
      currentY.current = e.touches[0].clientY
      const delta = currentY.current - startY.current
      if (delta > 0 && sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${delta}px)`
        sheetRef.current.style.opacity = 1 - delta / 300
      }
    }
    const handleTouchEnd = () => {
      const delta = currentY.current - startY.current
      if (delta > 100) {
        onClose()
      } else if (sheetRef.current) {
        sheetRef.current.style.transform = ''
        sheetRef.current.style.opacity = ''
      }
    }
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col justify-end animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className="relative overflow-hidden transition-transform duration-200 ease-out animate-sheet-up"
        style={{ maxHeight: '70vh', backgroundColor: 'var(--surface)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="sheet-handle" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold text-text">{title || 'Collections'}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded transition-colors duration-100"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 60px)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Mobile Collections Sheet ─────────────────────────────────────────────────
export const MobileCollectionsSheet = ({ isOpen, onClose, collections, photos, activeCollection, onSelect }) => {
  const favCount = photos.filter(p => p.isFavorite).length

  const getCover = (col) => {
    const cover = photos.find(p => p.id === col.coverPhotoId)
    const inCol = photos.find(p => p.collectionId === col.id)
    return cover || inCol
  }

  const items = [
    { id: null, label: 'All Photos', icon: Grid3X3, count: photos.length },
    { id: '__favorites__', label: 'Favorites', icon: Star, count: favCount },
  ]

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Navigate">
      <div className="p-3 space-y-1">
        {/* Main nav */}
        {items.map(item => (
          <button
            key={item.id ?? 'all'}
            onClick={() => { onSelect(item.id); onClose() }}
            className={`w-full text-left px-3 py-3 rounded text-sm flex items-center gap-3 transition-all duration-100 ${
              activeCollection === item.id ? 'active' : ''
            }`}
            style={activeCollection === item.id ? {} : { color: 'var(--text-secondary)' }}
            onMouseEnter={e => { if (activeCollection !== item.id) e.currentTarget.style.backgroundColor = 'var(--border)' }}
            onMouseLeave={e => { if (activeCollection !== item.id) e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <item.icon size={16} />
            <span className="flex-1">{item.label}</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.count}</span>
          </button>
        ))}

        {/* Collections */}
        <div className="pt-3 pb-1">
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-tertiary)' }}>Collections</span>
            <button className="p-1 rounded transition-colors" style={{ color: 'var(--text-secondary)' }}>
              <FolderPlus size={13} />
            </button>
          </div>
        </div>

        {collections.length === 0 && (
          <p className="text-xs px-3 py-4 text-center" style={{ color: 'var(--text-tertiary)' }}>No collections yet</p>
        )}

        {collections.map(col => {
          const count = photos.filter(p => p.collectionId === col.id).length
          const cover = getCover(col)
          return (
            <button
              key={col.id}
              onClick={() => { onSelect(col.id); onClose() }}
              className={`w-full text-left px-3 py-3 rounded flex items-center gap-3 transition-all duration-100 ${
                activeCollection === col.id ? 'active' : ''
              }`}
              style={activeCollection === col.id ? {} : { color: 'var(--text-secondary)' }}
              onMouseEnter={e => { if (activeCollection !== col.id) e.currentTarget.style.backgroundColor = 'var(--border)' }}
              onMouseLeave={e => { if (activeCollection !== col.id) e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <div className="w-9 h-9 rounded overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--card)' }}>
                {cover ? (
                  <img src={cover.dataUrl} alt={col.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Grid3X3 size={14} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{col.name}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{count} photos</p>
              </div>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}

// ─── FAB (Floating Action Button) ───────────────────────────────────────────
export const FAB = ({ onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 right-6 z-50 w-14 h-14 text-white rounded-full flex items-center justify-center transition-all duration-100"
    style={{ backgroundColor: 'var(--accent)', boxShadow: '0 4px 20px rgba(255,107,0,0.4)' }}
    aria-label="Upload photo"
    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--accent)'}
  >
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3V17M3 10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  </button>
)

// ─── Mobile photo card actions ────────────────────────────────────────────────
export const MobileQuickActions = ({ photo, onFavorite, onDelete, onAddToCollection, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="rounded-t-lg w-full max-w-sm p-4 animate-scale-in"
        style={{ backgroundColor: 'var(--surface)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pb-3">
          <div className="sheet-handle" />
        </div>
        <p className="text-sm font-medium text-text text-center mb-4 truncate px-4">{photo.note || 'Photo'}</p>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => { onFavorite(photo.id); onClose() }}
            className="flex flex-col items-center gap-1.5 p-3 rounded transition-colors duration-100"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <Heart size={18} style={photo.isFavorite ? { color: 'var(--accent)', fill: 'var(--accent)' } : { color: 'var(--text-secondary)' }} />
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{photo.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
          </button>
          <button
            onClick={() => { onAddToCollection(photo.id); onClose() }}
            className="flex flex-col items-center gap-1.5 p-3 rounded transition-colors duration-100"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <FolderPlus size={18} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Collection</span>
          </button>
          <button
            onClick={() => { onDelete(photo.id); onClose() }}
            className="flex flex-col items-center gap-1.5 p-3 rounded transition-colors duration-100"
            style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(239,68,68,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
          >
            <Trash2 size={18} style={{ color: 'var(--danger)' }} />
            <span className="text-[10px]" style={{ color: 'var(--danger)' }}>Delete</span>
          </button>
        </div>
      </div>
    </div>
  )
}
