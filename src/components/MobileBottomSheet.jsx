import { useState, useEffect, useRef } from 'react'
import { X, FolderPlus, Star, Grid3X3, Trash2, Edit3 } from 'lucide-react'

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
    <div className="fixed inset-0 z-[80] glass-overlay flex flex-col justify-end animate-fade-in" onClick={onClose}>
      <div
        ref={sheetRef}
        className="relative bg-surface rounded-t-2xl border-t border-border overflow-hidden transition-transform duration-200 ease-out"
        style={{ maxHeight: '70vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text">{title || 'Collections'}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-textSecondary hover:text-text hover:bg-card rounded-btn transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto pb-safe" style={{ maxHeight: 'calc(70vh - 60px)' }}>
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
            className={`w-full text-left px-3 py-3 rounded-btn text-sm flex items-center gap-3 transition-all duration-150 ${
              activeCollection === item.id
                ? 'bg-brand/10 text-brand border-l-2 border-brand'
                : 'text-textSecondary hover:text-text hover:bg-card border-l-2 border-transparent'
            }`}
          >
            <item.icon size={16} />
            <span className="flex-1">{item.label}</span>
            <span className="text-xs text-textSecondary/60">{item.count}</span>
          </button>
        ))}

        {/* Collections */}
        <div className="pt-3 pb-1">
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-[11px] uppercase tracking-wider text-textSecondary font-semibold">Collections</span>
            <button className="p-1 text-textSecondary hover:text-brand transition-all">
              <FolderPlus size={13} />
            </button>
          </div>
        </div>

        {collections.length === 0 && (
          <p className="text-xs text-textSecondary/50 px-3 py-4 text-center">No collections yet</p>
        )}

        {collections.map(col => {
          const count = photos.filter(p => p.collectionId === col.id).length
          const cover = getCover(col)
          return (
            <button
              key={col.id}
              onClick={() => { onSelect(col.id); onClose() }}
              className={`w-full text-left px-3 py-3 rounded-btn flex items-center gap-3 transition-all duration-150 ${
                activeCollection === col.id
                  ? 'bg-brand/10 text-brand border-l-2 border-brand'
                  : 'text-textSecondary hover:text-text hover:bg-card border-l-2 border-transparent'
              }`}
            >
              <div className="w-9 h-9 rounded-btn overflow-hidden bg-card flex-shrink-0">
                {cover ? (
                  <img src={cover.dataUrl} alt={col.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Grid3X3 size={14} className="text-textSecondary/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{col.name}</p>
                <p className="text-[11px] text-textSecondary/60">{count} photos</p>
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
    className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-brand hover:bg-brand-light text-white rounded-full shadow-lg shadow-brand/30 flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95"
    style={{ boxShadow: '0 4px 20px rgba(255,107,0,0.4)' }}
    aria-label="Upload photo"
  >
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3V17M3 10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  </button>
)

// ─── Mobile photo card actions ────────────────────────────────────────────────
export const MobileQuickActions = ({ photo, onFavorite, onDelete, onAddToCollection, onClose }) => {
  return (
    <div className="fixed inset-0 z-[75] glass-overlay flex items-end justify-center animate-fade-in" onClick={onClose}>
      <div
        className="bg-surface rounded-t-2xl border-t border-border w-full max-w-sm p-4 pb-safe animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pb-3">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>
        <p className="text-sm font-medium text-text text-center mb-4 truncate px-4">{photo.note || 'Photo'}</p>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => { onFavorite(photo.id); onClose() }}
            className="flex flex-col items-center gap-1.5 p-3 rounded-btn bg-card border border-border hover:border-brand transition-all"
          >
            <Heart size={18} className={photo.isFavorite ? 'text-brand fill-brand' : 'text-textSecondary'} />
            <span className="text-[10px] text-textSecondary">{photo.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
          </button>
          <button
            onClick={() => { onAddToCollection(photo.id); onClose() }}
            className="flex flex-col items-center gap-1.5 p-3 rounded-btn bg-card border border-border hover:border-brand transition-all"
          >
            <FolderPlus size={18} className="text-textSecondary" />
            <span className="text-[10px] text-textSecondary">Collection</span>
          </button>
          <button
            onClick={() => { onDelete(photo.id); onClose() }}
            className="flex flex-col items-center gap-1.5 p-3 rounded-btn bg-card border border-red-500/30 hover:border-red-500 transition-all"
          >
            <Trash2 size={18} className="text-red-400" />
            <span className="text-[10px] text-red-400">Delete</span>
          </button>
        </div>
      </div>
    </div>
  )
}
