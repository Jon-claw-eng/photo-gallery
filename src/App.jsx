import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Search, Plus, Images, FolderOpen, X, Upload, ChevronLeft, ChevronRight, StickyNote, Trash2, Edit3, Check, Layers, FolderPlus, Sun, Moon, Download, Share2, Star, ChevronDown, ChevronUp, ZoomIn, Maximize2, Keyboard, Heart, LayoutPanelTop, XCircle, Filter } from 'lucide-react'
import { getPhotos, savePhotos, getCollections, saveCollections, generateId } from './utils/storage'
import { useToast } from './hooks/useToast'

// ─── Theme ───────────────────────────────────────────────────────────────────
const THEME_KEY = 'cosmos_theme'
const getTheme = () => localStorage.getItem(THEME_KEY) || 'dark'
const setTheme = (t) => localStorage.setItem(THEME_KEY, t)

// ─── Toast ───────────────────────────────────────────────────────────────────
const Toast = ({ toasts, removeToast }) => (
  <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
    {toasts.map(toast => (
      <div
        key={toast.id}
        className="px-4 py-3 rounded-card border text-sm flex items-center gap-3 bg-surface border-border text-text shadow-lg"
      >
        <span>{toast.message}</span>
        <button onClick={() => removeToast(toast.id)} className="text-textSecondary hover:text-text transition-colors duration-150">
          <X size={14} />
        </button>
      </div>
    ))}
  </div>
)

// ─── Shortcuts Modal ─────────────────────────────────────────────────────────
const ShortcutsModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
    <div className="bg-surface border border-border rounded-modal w-full max-w-sm p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-text tracking-wide flex items-center gap-2"><Keyboard size={15} /> Keyboard Shortcuts</h2>
        <button onClick={onClose} className="text-textSecondary hover:text-text transition-colors duration-150 p-1"><X size={16} /></button>
      </div>
      <div className="space-y-2.5">
        {[
          ['← / →', 'Navigate photos'],
          ['Escape', 'Close lightbox / modal'],
          ['F', 'Toggle fullscreen'],
          ['?', 'Show shortcuts'],
          ['D', 'Download photo'],
          ['S', 'Toggle favorite'],
          ['C', 'Copy link'],
        ].map(([key, desc]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="text-textSecondary">{desc}</span>
            <kbd className="px-2 py-1 bg-card border border-border rounded-btn text-[11px] text-text font-mono">{key}</kbd>
          </div>
        ))}
      </div>
    </div>
  </div>
)

// ─── Empty State ─────────────────────────────────────────────────────────────
const EmptyState = ({ type, onAction, isCollection }) => {
  const configs = {
    photos: { icon: Images, title: 'No photos yet', desc: 'Upload your first photo to get started.', action: 'Upload Photo' },
    favorites: { icon: Star, title: 'No favorites yet', desc: 'Star your best photos to see them here.', action: null },
    collection: { icon: FolderOpen, title: 'No photos in this collection', desc: 'Add photos from the gallery or upload new ones.', action: 'Add Photos' },
    collections: { icon: FolderOpen, title: 'No collections', desc: 'Create collections to organize your photos.', action: 'New Collection' },
    search: { icon: Search, title: 'No results', desc: 'Try searching with different keywords.', action: null },
    batch: { icon: Images, title: 'No photos selected', desc: 'Check the box on photos to select them.', action: null },
  }
  const c = configs[type] || configs.photos
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-12 h-12 rounded-card bg-card flex items-center justify-center mb-4">
        <c.icon size={20} className="text-textSecondary" />
      </div>
      <h3 className="text-sm font-semibold text-text mb-1">{c.title}</h3>
      <p className="text-xs text-textSecondary mb-5 max-w-xs">{c.desc}</p>
      {c.action && onAction && (
        <button onClick={onAction} className="px-4 py-2 text-xs font-medium bg-accent hover:bg-accent/90 text-white rounded-btn transition-all duration-150 flex items-center gap-1.5">
          <Plus size={14} /> {c.action}
        </button>
      )}
    </div>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
const Lightbox = ({ photo, photos, onClose, onNext, onPrev, onDelete, onToggleFavorite, onDownload, onCopyLink, addToast }) => {
  const [zoom, setZoom] = useState(1)
  const [showInfo, setShowInfo] = useState(false)
  const imgRef = useRef(null)
  const containerRef = useRef(null)

  // EXIF-like info (we store dimensions at upload time)
  const info = useMemo(() => {
    if (!photo) return null
    return {
      resolution: photo.width && photo.height ? `${photo.width} × ${photo.height}` : 'Unknown',
      fileSize: photo.fileSize || null,
      date: photo.createdAt ? new Date(photo.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown',
    }
  }, [photo])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onNext()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      if (e.key === 'd' || e.key === 'D') onDownload(photo)
      if (e.key === 's' || e.key === 'S') onToggleFavorite(photo.id)
      if (e.key === 'c' || e.key === 'C') onCopyLink(photo, addToast)
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 4))
      if (e.key === '-') setZoom(z => Math.max(z - 0.25, 0.5))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, onNext, onPrev, photo, onDownload, onToggleFavorite, onCopyLink, addToast])

  useEffect(() => { setZoom(1) }, [photo?.id])

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

  const currentIndex = photos.findIndex(p => p.id === photo?.id)

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center animate-fade-in"
      onClick={onClose}
      ref={containerRef}
    >
      {/* Controls */}
      <button
        className="absolute top-4 right-4 z-10 text-textSecondary hover:text-text transition-colors duration-150 p-2 rounded-btn hover:bg-white/10"
        onClick={onClose}
      >
        <X size={20} />
      </button>

      {currentIndex > 0 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-textSecondary hover:text-text transition-colors duration-150 p-2 rounded-btn hover:bg-white/10"
          onClick={(e) => { e.stopPropagation(); onPrev() }}
        >
          <ChevronLeft size={28} />
        </button>
      )}
      {currentIndex < photos.length - 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-textSecondary hover:text-text transition-colors duration-150 p-2 rounded-btn hover:bg-white/10"
          onClick={(e) => { e.stopPropagation(); onNext() }}
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Zoomable image */}
      <div
        className="relative flex items-center justify-center w-full h-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        style={{ cursor: zoom > 1 ? 'zoom-out' : 'zoom-in' }}
      >
        <img
          ref={imgRef}
          src={photo.dataUrl}
          alt={photo.note || 'Photo'}
          className="max-w-[90vw] max-h-[80vh] object-contain rounded-modal transition-transform duration-150"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          onClick={(e) => { e.stopPropagation(); setZoom(z => z > 1 ? 1 : 2) }}
          draggable={false}
        />
      </div>

      {/* Info bar */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-white/10 bg-black/80 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 text-xs text-textSecondary">
              <button onClick={() => setShowInfo(!showInfo)} className="flex items-center gap-1 hover:text-text transition-colors">
                <ZoomIn size={12} /> {Math.round(zoom * 100)}%
              </button>
              {info.resolution && <span>{info.resolution}</span>}
              {info.fileSize && <span>{info.fileSize}</span>}
              <span>{info.date}</span>
              {photo.note && <span className="truncate max-w-[200px]">{photo.note}</span>}
            </div>
            {showInfo && (
              <div className="mt-2 text-xs text-textSecondary space-y-1">
                <div>Resolution: {info.resolution}</div>
                {info.fileSize && <div>Size: {info.fileSize}</div>}
                <div>Added: {info.date}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onCopyLink(photo, addToast) }}
              className="p-2 text-textSecondary hover:text-text hover:bg-white/10 rounded-btn transition-all duration-150"
              title="Copy link (C)"
            >
              <Share2 size={15} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(photo) }}
              className="p-2 text-textSecondary hover:text-text hover:bg-white/10 rounded-btn transition-all duration-150"
              title="Download (D)"
            >
              <Download size={15} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen() }}
              className="p-2 text-textSecondary hover:text-text hover:bg-white/10 rounded-btn transition-all duration-150"
              title="Fullscreen (F)"
            >
              <Maximize2 size={15} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(photo.id) }}
              className={`p-2 hover:bg-white/10 rounded-btn transition-all duration-150 ${photo.isFavorite ? 'text-yellow-400' : 'text-textSecondary hover:text-yellow-400'}`}
              title="Favorite (S)"
            >
              <Star size={15} fill={photo.isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(photo.id) }}
              className="p-2 text-textSecondary hover:text-red-400 hover:bg-red-400/10 rounded-btn transition-all duration-150"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
const UploadModal = ({ onClose, onUpload, collections, currentCollectionId }) => {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState(null)
  const [note, setNote] = useState('')
  const [selectedCollection, setSelectedCollection] = useState(currentCollectionId || '')
  const [fileInfo, setFileInfo] = useState(null)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
      // Get dimensions
      const img = new Image()
      img.onload = () => {
        setFileInfo({
          width: img.width,
          height: img.height,
          fileSize: formatFileSize(file.size),
        })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleSubmit = () => {
    if (!preview) return
    onUpload({ dataUrl: preview, note, collectionId: selectedCollection || null, ...fileInfo })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-surface border border-border rounded-modal w-full max-w-md p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-text tracking-wide">Upload Photo</h2>
          <button onClick={onClose} className="text-textSecondary hover:text-text transition-colors duration-150 p-1"><X size={16} /></button>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-card p-6 text-center transition-all duration-150 mb-4 ${
            dragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-borderHover'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files[0]) }}
        >
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-btn object-contain" />
              {fileInfo && (
                <div className="mt-2 text-[10px] text-textSecondary text-center">
                  {fileInfo.width}×{fileInfo.height} · {fileInfo.fileSize}
                </div>
              )}
            </div>
          ) : (
            <>
              <Upload size={24} className="mx-auto mb-3 text-textSecondary" />
              <p className="text-xs text-textSecondary mb-1">Drag & drop or click to browse</p>
              <p className="text-xs text-textSecondary/50">PNG, JPG, GIF, WEBP</p>
            </>
          )}
          <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFile(e.target.files[0])} />
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          className="w-full bg-card border border-border rounded-btn px-3 py-2.5 text-xs text-text placeholder-textSecondary/50 focus:outline-none focus:border-borderHover transition-colors duration-150 resize-none mb-3"
          rows={2}
        />

        {collections.length > 0 && (
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="w-full bg-card border border-border rounded-btn px-3 py-2.5 text-xs text-text focus:outline-none focus:border-borderHover transition-colors duration-150 mb-3"
          >
            <option value="">No collection</option>
            {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        <button
          onClick={handleSubmit}
          disabled={!preview}
          className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:bg-card disabled:text-textSecondary text-white text-xs font-medium rounded-btn transition-all duration-150 flex items-center justify-center gap-1.5"
        >
          <Check size={14} /> Save Photo
        </button>
      </div>
    </div>
  )
}

// ─── Collection Modal ─────────────────────────────────────────────────────────
const CollectionModal = ({ onClose, onSave, collection }) => {
  const [name, setName] = useState(collection?.name || '')
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-surface border border-border rounded-modal w-full max-w-sm p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-text tracking-wide">{collection ? 'Edit Collection' : 'New Collection'}</h2>
          <button onClick={onClose} className="text-textSecondary hover:text-text transition-colors duration-150 p-1"><X size={16} /></button>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Collection name"
          className="w-full bg-card border border-border rounded-btn px-3 py-2.5 text-xs text-text placeholder-textSecondary/50 focus:outline-none focus:border-borderHover transition-colors duration-150 mb-3"
          autoFocus
        />
        <button
          onClick={() => name.trim() && onSave(name.trim())}
          disabled={!name.trim()}
          className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:bg-card disabled:text-textSecondary text-white text-xs font-medium rounded-btn transition-all duration-150 flex items-center justify-center gap-1.5"
        >
          <Check size={14} /> {collection ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  )
}

// ─── Batch Actions Bar ────────────────────────────────────────────────────────
const BatchActionsBar = ({ selected, onDelete, onAddToCollection, onClear, collections }) => {
  const [showCollectionPicker, setShowCollectionPicker] = useState(false)
  if (selected.size === 0) return null
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[55] flex items-center gap-2 px-4 py-3 bg-surface border border-border rounded-btn shadow-xl animate-scale-in">
      <span className="text-xs text-textSecondary mr-1">{selected.size} selected</span>
      <button
        onClick={() => setShowCollectionPicker(true)}
        className="px-3 py-1.5 bg-card border border-border hover:border-borderHover text-xs text-text rounded-btn transition-all duration-150 flex items-center gap-1.5"
      >
        <FolderPlus size={12} /> Add to Collection
      </button>
      <button
        onClick={onDelete}
        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-btn transition-all duration-150 flex items-center gap-1.5"
      >
        <Trash2 size={12} /> Delete
      </button>
      <button onClick={onClear} className="p-1.5 text-textSecondary hover:text-text transition-colors duration-150">
        <XCircle size={14} />
      </button>

      {showCollectionPicker && (
        <div className="absolute bottom-full left-0 mb-2 bg-surface border border-border rounded-card p-2 shadow-xl min-w-[160px]">
          <p className="text-[10px] text-textSecondary px-2 py-1 mb-1">Move to collection</p>
          {collections.map(c => (
            <button
              key={c.id}
              onClick={() => { onAddToCollection(c.id); setShowCollectionPicker(false) }}
              className="w-full text-left px-2 py-1.5 text-xs text-text hover:bg-card rounded-btn transition-colors"
            >
              {c.name}
            </button>
          ))}
          <button
            onClick={() => { onAddToCollection(null); setShowCollectionPicker(false) }}
            className="w-full text-left px-2 py-1.5 text-xs text-textSecondary hover:bg-card rounded-btn transition-colors"
          >
            Remove from collection
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Sort Options ─────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { id: 'date-new', label: 'Newest first' },
  { id: 'date-old', label: 'Oldest first' },
  { id: 'name-az', label: 'Name A–Z' },
  { id: 'name-za', label: 'Name Z–A' },
  { id: 'size-desc', label: 'Largest first' },
  { id: 'size-asc', label: 'Smallest first' },
]

// ─── Photo Card ───────────────────────────────────────────────────────────────
const PhotoCard = ({ photo, collections, onOpen, onAddToCollection, isSelected, onToggleSelect, onSetCover, onToggleFavorite, showCheckbox }) => {
  const col = collections.find(c => c.id === photo.collectionId)
  const [hovered, setHovered] = useState(false)

  const formatSize = (bytes) => {
    if (!bytes) return null
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div
      className="masonry-item group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      {showCheckbox && (
        <div
          className={`absolute top-2 left-2 z-10 transition-all duration-150 ${hovered || isSelected ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => { e.stopPropagation(); onToggleSelect(photo.id) }}
        >
          <div className={`w-5 h-5 rounded-btn border-2 flex items-center justify-center cursor-pointer transition-all duration-150 ${
            isSelected ? 'bg-accent border-accent' : 'bg-black/50 border-white/50'
          }`}>
            {isSelected && <Check size={11} className="text-white" />}
          </div>
        </div>
      )}

      {/* Favorite star */}
      <button
        className={`absolute top-2 right-2 z-10 p-1.5 rounded-btn transition-all duration-150 ${
          hovered || photo.isFavorite ? 'opacity-100' : 'opacity-0'
        } ${photo.isFavorite ? 'text-yellow-400' : 'text-textSecondary hover:text-yellow-400'}`}
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(photo.id) }}
      >
        <Star size={14} fill={photo.isFavorite ? 'currentColor' : 'none'} />
      </button>

      {/* Photo */}
      <div
        className={`relative overflow-hidden rounded-card border border-border cursor-pointer transition-all duration-150 ${
          isSelected ? 'border-accent ring-2 ring-accent/30' : 'hover:border-borderHover'
        } ${hovered ? 'scale-[1.01]' : ''}`}
        onClick={() => onOpen(photo)}
      >
        <img
          src={photo.dataUrl}
          alt={photo.note || 'Photo'}
          className="w-full object-cover block"
          loading="lazy"
        />

        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-150 ${hovered ? 'opacity-100' : ''}`}>
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <div className="text-[10px] text-white/80 space-y-0.5">
              {photo.width && photo.height && <div>{photo.width}×{photo.height}</div>}
              {photo.fileSize && <div>{formatSize(photo.fileSize)}</div>}
              <div>{new Date(photo.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onSetCover(photo.id) }}
              className="p-1.5 bg-black/70 hover:bg-black/90 rounded-btn transition-all duration-150"
              title="Set as cover"
            >
              <LayoutPanelTop size={12} className="text-textSecondary" />
            </button>
            {collections.length > 0 && (
              <select
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onAddToCollection(photo.id, e.target.value || null)}
                className="bg-black/70 border border-borderHover rounded-btn px-1.5 py-1 text-[10px] text-textSecondary cursor-pointer"
                value={photo.collectionId || ''}
              >
                <option value="">+ Collection</option>
                {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Collection Card ─────────────────────────────────────────────────────────
const CollectionCard = ({ collection, photos, onEdit, onDelete, onView, onSetCover, isActive }) => {
  const count = photos.filter(p => p.collectionId === collection.id).length
  const coverPhoto = photos.find(p => p.id === collection.coverPhotoId) || photos.find(p => p.collectionId === collection.id)

  return (
    <div
      className={`border rounded-card overflow-hidden transition-all duration-150 group cursor-pointer ${
        isActive ? 'border-accent bg-accent/5' : 'border-border hover:border-borderHover'
      }`}
      onClick={onView}
    >
      <div className="h-24 bg-card relative">
        {coverPhoto ? (
          <img src={coverPhoto.dataUrl} alt={collection.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen size={24} className="text-textSecondary/30" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-medium text-text truncate">{collection.name}</h3>
            <p className="text-[11px] text-textSecondary mt-0.5">{count} {count === 1 ? 'photo' : 'photos'}</p>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onSetCover() }}
              className="p-1 text-textSecondary hover:text-text hover:bg-card rounded-btn transition-all duration-150"
              title="Set cover"
            >
              <SetTop size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="p-1 text-textSecondary hover:text-text hover:bg-card rounded-btn transition-all duration-150"
            >
              <Edit3 size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1 text-textSecondary hover:text-red-400 hover:bg-red-400/10 rounded-btn transition-all duration-150"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar (Collections) ────────────────────────────────────────────────────
const Sidebar = ({ collections, photos, activeCollection, onSelectCollection, onNewCollection, onEditCollection, onDeleteCollection, onSetCover, showSidebar, onToggleSidebar }) => {
  if (!showSidebar) return null

  return (
    <aside className="w-56 flex-shrink-0 border-r border-border bg-surface/50 backdrop-blur-sm overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 120px)' }}>
      <div className="p-3 space-y-1">
        <button
          onClick={() => onSelectCollection(null)}
          className={`w-full text-left px-3 py-2 rounded-btn text-xs transition-all duration-150 flex items-center gap-2 ${
            activeCollection === null ? 'bg-accent/10 text-accent' : 'text-textSecondary hover:text-text hover:bg-card'
          }`}
        >
          <Layers size={13} /> All Photos
          <span className="ml-auto text-[10px] opacity-60">{photos.length}</span>
        </button>
        <button
          onClick={() => onSelectCollection('__favorites__')}
          className={`w-full text-left px-3 py-2 rounded-btn text-xs transition-all duration-150 flex items-center gap-2 ${
            activeCollection === '__favorites__' ? 'bg-accent/10 text-accent' : 'text-textSecondary hover:text-text hover:bg-card'
          }`}
        >
          <Star size={13} /> Favorites
          <span className="ml-auto text-[10px] opacity-60">{photos.filter(p => p.isFavorite).length}</span>
        </button>

        <div className="pt-3 pb-1 px-3 flex items-center justify-between">
          <span className="text-[10px] text-textSecondary uppercase tracking-wider font-medium">Collections</span>
          <button
            onClick={onNewCollection}
            className="p-1 text-textSecondary hover:text-text transition-colors duration-150"
          >
            <FolderPlus size={12} />
          </button>
        </div>

        {collections.map(col => (
          <CollectionCard
            key={col.id}
            collection={col}
            photos={photos}
            isActive={activeCollection === col.id}
            onView={() => onSelectCollection(col.id)}
            onEdit={() => onEditCollection(col)}
            onDelete={() => onDeleteCollection(col.id)}
            onSetCover={() => onSetCover(col.id)}
          />
        ))}
      </div>
    </aside>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
const App = () => {
  const [photos, setPhotos] = useState([])
  const [collections, setCollections] = useState([])
  const [activeTab, setActiveTab] = useState('photos')
  const [searchQuery, setSearchQuery] = useState('')
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showCollection, setShowCollection] = useState(false)
  const [editingCollection, setEditingCollection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [theme, setTheme] = useState(getTheme)
  const [sortBy, setSortBy] = useState('date-new')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [showSidebar, setShowSidebar] = useState(false)
  const [activeCollection, setActiveCollection] = useState(null) // null = all, '__favorites__' = favorites, string = collection id
  const { toasts, addToast, removeToast } = useToast()
  const fileInputRef = useRef(null)

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    setTheme(theme)
  }, [theme])

  useEffect(() => {
    setPhotos(getPhotos())
    setCollections(getCollections())
    setTimeout(() => setLoading(false), 400)
  }, [])

  // Keyboard shortcut listener for global shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        setShowShortcuts(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setTheme(next)
  }

  const handleUpload = useCallback(({ dataUrl, note, collectionId, width, height, fileSize }) => {
    const newPhoto = {
      id: generateId(),
      dataUrl,
      note,
      collectionId,
      width,
      height,
      fileSize,
      createdAt: new Date().toISOString(),
      isFavorite: false,
    }
    const updated = [newPhoto, ...photos]
    setPhotos(updated)
    savePhotos(updated)
    addToast('Photo saved')
  }, [photos, addToast])

  const handleDeletePhoto = useCallback((id) => {
    const updated = photos.filter(p => p.id !== id)
    setPhotos(updated)
    savePhotos(updated)
    setLightboxPhoto(null)
    addToast('Photo deleted')
  }, [photos, addToast])

  const handleBatchDelete = useCallback(() => {
    const updated = photos.filter(p => !selected.has(p.id))
    setPhotos(updated)
    savePhotos(updated)
    setSelected(new Set())
    setBatchMode(false)
    addToast(`${selected.size} photos deleted`)
  }, [photos, selected, addToast])

  const handleBatchAddToCollection = useCallback((collectionId) => {
    const updated = photos.map(p => selected.has(p.id) ? { ...p, collectionId } : p)
    setPhotos(updated)
    savePhotos(updated)
    setSelected(new Set())
    setBatchMode(false)
    addToast(`Moved to collection`)
  }, [photos, selected, addToast])

  const handleSaveCollection = useCallback((name) => {
    if (editingCollection) {
      const updated = collections.map(c => c.id === editingCollection.id ? { ...c, name } : c)
      setCollections(updated)
      saveCollections(updated)
      addToast('Collection updated')
    } else {
      const newCollection = { id: generateId(), name, createdAt: new Date().toISOString() }
      const updated = [newCollection, ...collections]
      setCollections(updated)
      saveCollections(updated)
      addToast('Collection created')
    }
    setShowCollection(false)
    setEditingCollection(null)
  }, [collections, editingCollection, addToast])

  const handleDeleteCollection = useCallback((id) => {
    const updated = collections.filter(c => c.id !== id)
    setCollections(updated)
    saveCollections(updated)
    const updatedPhotos = photos.map(p => p.collectionId === id ? { ...p, collectionId: null } : p)
    setPhotos(updatedPhotos)
    savePhotos(updatedPhotos)
    addToast('Collection deleted')
  }, [collections, photos, addToast])

  const handleAddToCollection = useCallback((photoId, collectionId) => {
    const updated = photos.map(p => p.id === photoId ? { ...p, collectionId } : p)
    setPhotos(updated)
    savePhotos(updated)
    addToast('Photo updated')
  }, [photos, addToast])

  const handleSetCover = useCallback((collectionId, photoId) => {
    // If photoId provided, set it as cover; otherwise just store the collection id for later
    if (photoId) {
      const updated = collections.map(c => c.id === collectionId ? { ...c, coverPhotoId: photoId } : c)
      setCollections(updated)
      saveCollections(updated)
      addToast('Cover updated')
    }
  }, [collections, addToast])

  const handleToggleFavorite = useCallback((photoId) => {
    const updated = photos.map(p => p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p)
    setPhotos(updated)
    savePhotos(updated)
    const photo = photos.find(p => p.id === photoId)
    if (photo) {
      addToast(photo.isFavorite ? 'Removed from favorites' : 'Added to favorites')
    }
  }, [photos, addToast])

  const handleDownload = useCallback((photo) => {
    const a = document.createElement('a')
    a.href = photo.dataUrl
    a.download = `photo-${photo.id}.jpg`
    a.click()
    addToast('Downloading...')
  }, [addToast])

  const handleCopyLink = useCallback((photo, toastAdd) => {
    const blob = dataURLToBlob(photo.dataUrl)
    if (navigator.clipboard && navigator.clipboard.write) {
      navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]).then(() => toastAdd('Link copied!')).catch(() => {
        // fallback: copy data URL
        navigator.clipboard.writeText(photo.dataUrl.slice(0, 100)).then(() => toastAdd('Link copied!'))
      })
    } else {
      navigator.clipboard.writeText(photo.dataUrl).then(() => toastAdd('Link copied!'))
    }
  }, [])

  const dataURLToBlob = (dataURL) => {
    const arr = dataURL.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) u8arr[n] = bstr.charCodeAt(n)
    return new Blob([u8arr], { type: mime })
  }

  // Filtering + sorting
  const filteredPhotos = useMemo(() => {
    let result = [...photos]

    // Collection filter
    if (activeCollection === '__favorites__') {
      result = result.filter(p => p.isFavorite)
    } else if (activeCollection !== null) {
      result = result.filter(p => p.collectionId === activeCollection)
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => {
        if (p.note?.toLowerCase().includes(q)) return true
        const col = collections.find(c => c.id === p.collectionId)
        if (col?.name.toLowerCase().includes(q)) return true
        return false
      })
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-new': return new Date(b.createdAt) - new Date(a.createdAt)
        case 'date-old': return new Date(a.createdAt) - new Date(b.createdAt)
        case 'name-az': return (a.note || '').localeCompare(b.note || '')
        case 'name-za': return (b.note || '').localeCompare(a.note || '')
        case 'size-desc': return (b.fileSize || 0) - (a.fileSize || 0)
        case 'size-asc': return (a.fileSize || 0) - (b.fileSize || 0)
        default: return 0
      }
    })

    return result
  }, [photos, searchQuery, sortBy, activeCollection, collections])

  const filteredCollections = collections.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const lightboxPhotos = filteredPhotos
  const lightboxIndex = lightboxPhotos.findIndex(p => p.id === lightboxPhoto?.id)
  const handleLightboxNext = () => setLightboxPhoto(lightboxPhotos[(lightboxIndex + 1) % lightboxPhotos.length])
  const handleLightboxPrev = () => setLightboxPhoto(lightboxPhotos[(lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <div className="min-h-screen pb-20 bg-bg text-text transition-colors duration-200">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md border-b border-border transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-13">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(s => !s)}
                className="p-2 text-textSecondary hover:text-text hover:bg-card rounded-btn transition-all duration-150 md:hidden"
              >
                <Layers size={16} />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-btn bg-card border border-border flex items-center justify-center">
                  <Images size={14} className="text-textSecondary" />
                </div>
                <span className="text-sm font-semibold text-text tracking-tight">Gallery</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-textSecondary hover:text-text hover:bg-card rounded-btn transition-all duration-150"
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={() => setBatchMode(b => !b)}
                className={`p-2 rounded-btn transition-all duration-150 ${batchMode ? 'bg-accent text-white' : 'text-textSecondary hover:text-text hover:bg-card'}`}
                title="Batch select"
              >
                <Filter size={16} />
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-medium rounded-btn transition-all duration-150 flex items-center gap-1.5"
              >
                <Plus size={14} /> Upload
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0 -mb-px overflow-x-auto">
            {[
              { id: 'photos', label: 'Photos', icon: Images, count: photos.length },
              { id: 'collections', label: 'Collections', icon: Layers, count: collections.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-xs font-medium transition-all duration-150 border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-text border-text'
                    : 'text-textSecondary border-transparent hover:text-text'
                }`}
              >
                <tab.icon size={13} className="inline mr-1.5" />
                {tab.label}
                <span className="ml-1 text-textSecondary/50">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 flex gap-4">
        {/* Sidebar */}
        {!isMobile && (
          <Sidebar
            collections={collections}
            photos={photos}
            activeCollection={activeCollection}
            onSelectCollection={setActiveCollection}
            onNewCollection={() => { setEditingCollection(null); setShowCollection(true) }}
            onEditCollection={(col) => { setEditingCollection(col); setShowCollection(true) }}
            onDeleteCollection={handleDeleteCollection}
            onSetCover={(colId) => { setActiveCollection(colId); addToast('Click a photo, then tap "Set as cover"') }}
            showSidebar={showSidebar}
            onToggleSidebar={() => setShowSidebar(s => !s)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search + Sort */}
          {activeTab === 'photos' && (
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search photos..."
                  className="w-full bg-card border border-border rounded-btn pl-9 pr-3 py-2.5 text-xs text-text placeholder-textSecondary/50 focus:outline-none focus:border-borderHover transition-colors duration-150"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-text transition-colors duration-150 p-0.5">
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(m => !m)}
                  className="px-3 py-2.5 bg-card border border-border hover:border-borderHover text-xs text-textSecondary rounded-btn transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap"
                >
                  Sort <ChevronDown size={12} />
                </button>
                {showSortMenu && (
                  <div className="absolute top-full right-0 mt-1 bg-surface border border-border rounded-card p-1 shadow-xl z-30 min-w-[140px]">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setSortBy(opt.id); setShowSortMenu(false) }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-btn transition-colors duration-150 flex items-center justify-between ${
                          sortBy === opt.id ? 'text-accent bg-accent/10' : 'text-text hover:bg-card'
                        }`}
                      >
                        {opt.label}
                        {sortBy === opt.id && <Check size={11} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && (
            loading ? (
              <div className="masonry">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="masonry-item">
                    <div className="bg-card rounded-card animate-pulse" style={{ height: `${Math.floor(Math.random() * 160) + 120}px` }} />
                  </div>
                ))}
              </div>
            ) : filteredPhotos.length === 0 ? (
              activeCollection === '__favorites__' ? (
                <EmptyState type="favorites" />
              ) : searchQuery ? (
                <EmptyState type="search" />
              ) : (
                <EmptyState type="photos" onAction={() => setShowUpload(true)} />
              )
            ) : (
              <div className="masonry">
                {filteredPhotos.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    collections={collections}
                    onOpen={setLightboxPhoto}
                    onAddToCollection={handleAddToCollection}
                    isSelected={selected.has(photo.id)}
                    onToggleSelect={(id) => {
                      setSelected(s => {
                        const next = new Set(s)
                        if (next.has(id)) next.delete(id)
                        else next.add(id)
                        return next
                      })
                    }}
                    onSetCover={(photoId) => {
                      if (activeCollection && activeCollection !== '__favorites__') {
                        handleSetCover(activeCollection, photoId)
                      }
                    }}
                    onToggleFavorite={handleToggleFavorite}
                    showCheckbox={batchMode}
                  />
                ))}
              </div>
            )
          )}

          {/* Collections Tab */}
          {activeTab === 'collections' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-textSecondary">{filteredCollections.length} collections</p>
                <button
                  onClick={() => { setEditingCollection(null); setShowCollection(true) }}
                  className="px-3 py-1.5 bg-card border border-border hover:border-borderHover text-xs font-medium text-text rounded-btn transition-all duration-150 flex items-center gap-1.5"
                >
                  <FolderPlus size={13} /> New
                </button>
              </div>
              {filteredCollections.length === 0 ? (
                <EmptyState type="collections" onAction={() => { setEditingCollection(null); setShowCollection(true) }} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredCollections.map(collection => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      photos={photos}
                      isActive={activeCollection === collection.id}
                      onView={() => { setActiveCollection(collection.id); setActiveTab('photos') }}
                      onEdit={() => { setEditingCollection(collection); setShowCollection(true) }}
                      onDelete={() => handleDeleteCollection(collection.id)}
                      onSetCover={() => { setActiveCollection(collection.id); addToast('Click a photo, then tap cover icon') }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Batch Actions */}
      {batchMode && (
        <BatchActionsBar
          selected={selected}
          onDelete={handleBatchDelete}
          onAddToCollection={handleBatchAddToCollection}
          onClear={() => { setSelected(new Set()); setBatchMode(false) }}
          collections={collections}
        />
      )}

      {/* Modals */}
      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          photos={lightboxPhotos}
          onClose={() => setLightboxPhoto(null)}
          onNext={handleLightboxNext}
          onPrev={handleLightboxPrev}
          onDelete={handleDeletePhoto}
          onToggleFavorite={handleToggleFavorite}
          onDownload={handleDownload}
          onCopyLink={handleCopyLink}
          addToast={addToast}
        />
      )}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
          collections={collections}
          currentCollectionId={activeCollection !== null && activeCollection !== '__favorites__' ? activeCollection : undefined}
        />
      )}
      {showCollection && (
        <CollectionModal
          onClose={() => { setShowCollection(false); setEditingCollection(null) }}
          onSave={handleSaveCollection}
          collection={editingCollection}
        />
      )}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default App
