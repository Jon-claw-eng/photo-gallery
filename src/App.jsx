import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Search, Plus, Images, FolderOpen, X, Upload, ChevronLeft, ChevronRight,
  StickyNote, Trash2, Edit3, Check, Layers, FolderPlus, Sun, Moon, Download,
  Share2, Star, ChevronDown, ZoomIn, Maximize2, Keyboard, Heart,
  LayoutPanelTop, XCircle, Filter, Menu, Grid3X3, Menu as Hamburger, Hash
} from 'lucide-react'
import { getPhotos, savePhotos, getCollections, saveCollections, generateId } from './utils/storage'
import { useToast } from './hooks/useToast'
import { MobileCollectionsSheet, BottomSheet, FAB, useIsMobile } from './components/MobileBottomSheet'
import LightboxComponent from './components/Lightbox'

// ─── Theme ───────────────────────────────────────────────────────────────────
const THEME_KEY = 'cosmos_theme'
const getSystemTheme = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
const getTheme = () =>
  localStorage.getItem(THEME_KEY) ||
  (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
const setTheme = (t) => localStorage.setItem(THEME_KEY, t)

// ─── Sort Options ─────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { id: 'date-new',  label: 'Newest first' },
  { id: 'date-old',  label: 'Oldest first' },
  { id: 'name-az',    label: 'Name A–Z' },
  { id: 'name-za',    label: 'Name Z–A' },
  { id: 'size-desc',  label: 'Largest first' },
  { id: 'size-asc',   label: 'Smallest first' },
]

// ─── Shortcuts Modal ─────────────────────────────────────────────────────────
const ShortcutsModal = ({ onClose }) => (
  <div
    className="fixed inset-0 z-[70] lightbox-backdrop flex items-center justify-center p-6 animate-fade-in"
    onClick={onClose}
  >
    <div
      className="glass-modal rounded-modal w-full max-w-sm p-6 animate-scale-in"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-text tracking-wide flex items-center gap-2">
          <Keyboard size={15} className="text-brand" /> Keyboard Shortcuts
        </h2>
        <button
          onClick={onClose}
          className="text-textSecondary hover:text-text transition-colors duration-150 p-1 rounded-btn hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>
      <div className="space-y-2.5">
        {[
          ['← / →',    'Navigate photos'],
          ['Escape',   'Close lightbox / modal'],
          ['F',        'Toggle fullscreen'],
          ['D',        'Download photo'],
          ['S',        'Toggle favorite'],
          ['C',        'Copy link'],
          ['+ / −',    'Zoom in / out'],
          ['?',        'Show shortcuts'],
        ].map(([key, desc]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="text-textSecondary">{desc}</span>
            <kbd className="px-2 py-1 bg-card border border-white/10 rounded-btn text-[11px] text-text font-mono">
              {key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  </div>
)

// ─── Empty State ─────────────────────────────────────────────────────────────
const EmptyState = ({ type, onAction }) => {
  const configs = {
    photos: {
      icon: Images,
      title: 'No photos yet',
      desc: 'Upload your first photo to get started.',
      action: 'Upload Photo'
    },
    favorites: {
      icon: Star,
      title: 'No favorites yet',
      desc: 'Star your best photos to see them here.',
      action: null
    },
    collection: {
      icon: FolderOpen,
      title: 'No photos in this collection',
      desc: 'Add photos from the gallery or upload new ones.',
      action: 'Add Photos'
    },
    collections: {
      icon: FolderOpen,
      title: 'No collections',
      desc: 'Create collections to organize your photos.',
      action: 'New Collection'
    },
    search: {
      icon: Search,
      title: 'No results',
      desc: 'Try searching with different keywords.',
      action: null
    },
  }
  const c = configs[type] || configs.photos
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-card bg-card flex items-center justify-center mb-4 glass-card animate-scale-in">
        <c.icon size={22} className="text-textSecondary" />
      </div>
      <h3 className="text-sm font-semibold text-text mb-1">{c.title}</h3>
      <p className="text-xs text-textSecondary mb-5 max-w-xs">{c.desc}</p>
      {c.action && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-medium bg-brand hover:bg-brand-light text-white rounded-btn transition-all duration-200 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={14} /> {c.action}
        </button>
      )}
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
      const img = new Image()
      img.onload = () => {
        setFileInfo({ width: img.width, height: img.height, fileSize: formatFileSize(file.size) })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return null
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleSubmit = () => {
    if (!preview) return
    onUpload({ dataUrl: preview, note, collectionId: selectedCollection || null, ...fileInfo })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] lightbox-backdrop flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-modal rounded-modal w-full max-w-md p-6 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-text tracking-wide">Upload Photo</h2>
          <button
            onClick={onClose}
            className="text-textSecondary hover:text-text transition-all duration-150 p-1 rounded-btn hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`relative border-2 border-dashed rounded-card p-8 text-center transition-all duration-200 mb-4 ${
            dragActive
              ? 'border-brand bg-brand/5 scale-[1.01]'
              : 'glass-upload-zone hover:border-brand/60 hover:bg-white/8'
          }`}
          onDragOver={e => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={e => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files[0]) }}
        >
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="max-h-44 mx-auto rounded-btn object-contain" />
              {fileInfo && (
                <div className="mt-2 text-[10px] text-textSecondary text-center">
                  {fileInfo.width}×{fileInfo.height} · {fileInfo.fileSize}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="w-12 h-12 mx-auto mb-3 rounded-btn bg-card flex items-center justify-center">
                <Upload size={20} className="text-textSecondary" />
              </div>
              <p className="text-xs text-textSecondary mb-1 font-medium">Drag & drop or click to browse</p>
              <p className="text-xs text-textSecondary/50">PNG, JPG, GIF, WEBP</p>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          className="w-full bg-card border border-border rounded-btn px-3 py-2.5 text-xs text-text placeholder-textSecondary/50 focus:outline-none focus:border-brand/50 transition-colors duration-150 resize-none mb-3"
          rows={2}
        />

        {collections.length > 0 && (
          <select
            value={selectedCollection}
            onChange={e => setSelectedCollection(e.target.value)}
            className="w-full bg-card border border-border rounded-btn px-3 py-2.5 text-xs text-text focus:outline-none focus:border-brand/50 transition-colors duration-150 mb-3"
          >
            <option value="">No collection</option>
            {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        <button
          onClick={handleSubmit}
          disabled={!preview}
          className="w-full py-2.5 bg-brand hover:bg-brand-light disabled:bg-card disabled:text-textSecondary text-white text-xs font-medium rounded-btn transition-all duration-200 flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] disabled:hover:scale-100"
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
    <div
      className="fixed inset-0 z-[60] lightbox-backdrop flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-modal rounded-modal w-full max-w-sm p-6 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-text tracking-wide">
            {collection ? 'Edit Collection' : 'New Collection'}
          </h2>
          <button
            onClick={onClose}
            className="text-textSecondary hover:text-text transition-all duration-150 p-1 rounded-btn hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Collection name"
          className="w-full bg-card border border-border rounded-btn px-3 py-2.5 text-xs text-text placeholder-textSecondary/50 focus:outline-none focus:border-brand/50 transition-colors duration-150 mb-3"
          autoFocus
        />
        <button
          onClick={() => name.trim() && onSave(name.trim())}
          disabled={!name.trim()}
          className="w-full py-2.5 bg-brand hover:bg-brand-light disabled:bg-card disabled:text-textSecondary text-white text-xs font-medium rounded-btn transition-all duration-200 flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] disabled:hover:scale-100"
        >
          <Check size={14} /> {collection ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  )
}

// ─── Batch Actions Bar ───────────────────────────────────────────────────────
const BatchActionsBar = ({ selected, onDelete, onAddToCollection, onClear, collections }) => {
  const [showPicker, setShowPicker] = useState(false)
  if (selected.size === 0) return null
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[55] flex items-center gap-2 px-4 py-3 glass-card rounded-btn shadow-xl animate-batch-slide-down">
      <span className="text-xs text-textSecondary font-medium">{selected.size} selected</span>

      <div className="w-px h-4 bg-white/10" />

      <button
        onClick={() => setShowPicker(p => !p)}
        className="px-3 py-1.5 bg-card border border-border hover:border-brand text-xs text-text rounded-btn transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
      >
        <FolderPlus size={12} /> Add to Collection
      </button>

      <button
        onClick={onDelete}
        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-btn transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
      >
        <Trash2 size={12} /> Delete
      </button>

      <div className="w-px h-4 bg-white/10" />

      <button
        onClick={onClear}
        className="p-1.5 text-textSecondary hover:text-text transition-all duration-150 hover:scale-[1.05] active:scale-[0.95]"
      >
        <XCircle size={14} />
      </button>

      {showPicker && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 glass-card rounded-card p-2 shadow-xl min-w-[160px] animate-scale-in">
          <p className="text-[10px] text-textSecondary uppercase tracking-wider px-2 py-1 mb-1">
            Move to collection
          </p>
          {collections.map(c => (
            <button
              key={c.id}
              onClick={() => { onAddToCollection(c.id); setShowPicker(false) }}
              className="w-full text-left px-2 py-1.5 text-xs text-text hover:bg-white/10 rounded-btn transition-colors"
            >
              {c.name}
            </button>
          ))}
          <button
            onClick={() => { onAddToCollection(null); setShowPicker(false) }}
            className="w-full text-left px-2 py-1.5 text-xs text-textSecondary hover:bg-white/10 rounded-btn transition-colors"
          >
            Remove from collection
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Collection Cover Mosaic ──────────────────────────────────────────────────
const CollectionCoverMosaic = ({ photos, count = 4 }) => {
  const covers = photos.slice(0, count)
  const emptySlots = count - covers.length

  return (
    <div className={`grid grid-cols-2 grid-rows-2 w-full h-full gap-px`}>
      {covers.map((p, i) => (
        <div key={p.id} className="overflow-hidden">
          <img src={p.dataUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ))}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div key={`empty-${i}`} className="bg-card" />
      ))}
    </div>
  )
}

// ─── Photo Card ───────────────────────────────────────────────────────────────
const PhotoCard = ({ photo, collections, onOpen, onAddToCollection, isSelected, onToggleSelect, onSetCover, onToggleFavorite, showCheckbox, animIndex }) => {
  const [hovered, setHovered] = useState(false)
  const [heartAnim, setHeartAnim] = useState(false)
  const [checkboxAnim, setCheckboxAnim] = useState(false)

  const formatSize = (bytes) => {
    if (!bytes) return null
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleToggleSelect = (id, e) => {
    e.stopPropagation()
    setCheckboxAnim(true)
    setTimeout(() => setCheckboxAnim(false), 200)
    onToggleSelect(id)
  }

  const handleFavorite = (id, e) => {
    e.stopPropagation()
    setHeartAnim(true)
    setTimeout(() => setHeartAnim(false), 350)
    onToggleFavorite(id)
  }

  return (
    <div
      className="masonry-item group/photo relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ animationDelay: `${animIndex * 40}ms` }}
    >
      {/* Checkbox */}
      {showCheckbox && (
        <div
          className={`absolute top-2 left-2 z-10 transition-all duration-200 ${
            hovered || isSelected ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={e => handleToggleSelect(photo.id, e)}
        >
          <div
            className={`w-5 h-5 rounded-btn flex items-center justify-center cursor-pointer transition-all duration-150 ${
              isSelected
                ? 'glass-checkbox-checked animate-checkbox-pop'
                : 'glass-checkbox'
            }`}
          >
            {isSelected && <Check size={11} className="text-white" />}
          </div>
        </div>
      )}

      {/* Favorite button */}
      <button
        className={`absolute top-2 right-2 z-10 p-1.5 rounded-btn transition-all duration-200 ${
          hovered || photo.isFavorite ? 'opacity-100' : 'opacity-0'
        } ${photo.isFavorite ? 'text-yellow-400' : 'text-white/60 hover:text-yellow-400'} ${
          heartAnim ? 'animate-heart-bounce' : ''
        }`}
        onClick={e => handleFavorite(photo.id, e)}
      >
        <Star size={14} fill={photo.isFavorite ? 'currentColor' : 'none'} />
      </button>

      {/* Card */}
      <div
        className={`relative overflow-hidden rounded-card border border-border cursor-pointer transition-all duration-200 photo-card ${
          isSelected
            ? 'border-brand shadow-card-selected'
            : hovered
            ? 'border-white/20 shadow-card-hover scale-[1.02] translateY(-2px)'
            : ''
        }`}
        onClick={() => onOpen(photo)}
      >
        <img
          src={photo.dataUrl}
          alt={photo.note || 'Photo'}
          className="w-full object-cover block"
          loading="lazy"
        />

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 transition-all duration-200 ${
            hovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="absolute inset-0 photo-card-glass-overlay" />
          <div className="absolute inset-0 flex flex-col justify-end p-3">
            <div className="text-[10px] text-white/80 space-y-0.5 translate-y-0 transition-transform duration-200">
              {photo.width && photo.height && <div>{photo.width}×{photo.height}</div>}
              {photo.fileSize && <div>{formatSize(photo.fileSize)}</div>}
              <div>{new Date(photo.createdAt).toLocaleDateString()}</div>
              {photo.note && <div className="truncate opacity-80">{photo.note}</div>}
            </div>

            {/* Action toolbar */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              <button
                onClick={e => { e.stopPropagation(); onSetCover(photo.id) }}
                className="p-1.5 glass-card rounded-btn transition-all duration-150 hover:scale-110 active:scale-95"
                title="Set as cover"
              >
                <LayoutPanelTop size={12} className="text-textSecondary" />
              </button>
              {collections.length > 0 && (
                <select
                  onClick={e => e.stopPropagation()}
                  onChange={e => onAddToCollection(photo.id, e.target.value || null)}
                  className="glass-card border-0 rounded-btn px-1.5 py-1 text-[10px] text-textSecondary cursor-pointer"
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
    </div>
  )
}

// ─── Collection Card ─────────────────────────────────────────────────────────
const CollectionCard = ({ collection, photos, onEdit, onDelete, onView, onSetCover, isActive }) => {
  const colPhotos = photos.filter(p => p.collectionId === collection.id)
  const coverPhoto = photos.find(p => p.id === collection.coverPhotoId)

  return (
    <div
      className={`border rounded-card overflow-hidden transition-all duration-200 group cursor-pointer ${
        isActive
          ? 'border-brand bg-brand/5'
          : 'border-border hover:border-white/20 hover:scale-[1.02] hover:shadow-card-hover'
      }`}
      onClick={onView}
    >
      {/* 4-photo mosaic cover */}
      <div className="h-24 bg-card relative overflow-hidden">
        {colPhotos.length > 0 ? (
          <CollectionCoverMosaic photos={coverPhoto ? [coverPhoto, ...colPhotos.filter(p => p.id !== coverPhoto.id).slice(0, 3)] : colPhotos.slice(0, 4)} count={4} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen size={24} className="text-textSecondary/30" />
          </div>
        )}
        {isActive && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-btn bg-brand text-[10px] font-medium text-white">
            Active
          </div>
        )}
      </div>

      <div className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-medium text-text truncate">{collection.name}</h3>
            <p className="text-[11px] text-textSecondary mt-0.5">
              {colPhotos.length} {colPhotos.length === 1 ? 'photo' : 'photos'}
            </p>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onSetCover() }}
              className="p-1 text-textSecondary hover:text-text hover:bg-card rounded-btn transition-all duration-150"
              title="Set cover"
            >
              <LayoutPanelTop size={11} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onEdit() }}
              className="p-1 text-textSecondary hover:text-text hover:bg-card rounded-btn transition-all duration-150"
            >
              <Edit3 size={11} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
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

// ─── Filter Chips ─────────────────────────────────────────────────────────────
const FilterChips = ({ activeCollection, collections, onSelect, photos }) => {
  const favCount = photos.filter(p => p.isFavorite).length
  const chips = [
    { id: null, label: 'All', count: photos.length },
    { id: '__favorites__', label: 'Favorites', count: favCount, icon: Star },
    ...collections.map(c => ({
      id: c.id,
      label: c.name,
      count: photos.filter(p => p.collectionId === c.id).length
    }))
  ]

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {chips.filter(c => c.count > 0 || c.id === null).map(chip => (
        <button
          key={chip.id ?? 'all'}
          onClick={() => onSelect(chip.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
            activeCollection === chip.id
              ? 'bg-brand text-white shadow-chip'
              : 'bg-card text-textSecondary hover:text-text hover:bg-white/10 border border-border'
          }`}
        >
          {chip.icon && <chip.icon size={11} />}
          {chip.label}
          <span className={`text-[10px] ${activeCollection === chip.id ? 'text-white/70' : 'text-textSecondary/60'}`}>
            {chip.count}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({ collections, photos, activeCollection, onSelectCollection, onNewCollection, onEditCollection, onDeleteCollection, onSetCover, showSidebar, onToggleSidebar }) => {
  if (!showSidebar) return null

  const favCount = photos.filter(p => p.isFavorite).length

  return (
    <aside className="w-[280px] flex-shrink-0 glass-sidebar overflow-y-auto"
      style={{ height: 'calc(100vh - 56px)' }}>
      <div className="p-3 space-y-1">
        {/* All Photos */}
        <button
          onClick={() => onSelectCollection(null)}
          className={`w-full text-left px-3 py-2 rounded-btn text-xs transition-all duration-200 flex items-center gap-2 ${
            activeCollection === null
              ? 'bg-gradient-to-r from-brand/20 to-transparent text-brand border-l-2 border-brand'
              : 'text-textSecondary hover:text-text hover:bg-white/5 border-l-2 border-transparent'
          }`}
        >
          <Grid3X3 size={13} /> All Photos
          <span className="ml-auto text-[10px] text-textSecondary/60">{photos.length}</span>
        </button>

        {/* Favorites */}
        <button
          onClick={() => onSelectCollection('__favorites__')}
          className={`w-full text-left px-3 py-2 rounded-btn text-xs transition-all duration-200 flex items-center gap-2 ${
            activeCollection === '__favorites__'
              ? 'bg-gradient-to-r from-brand/20 to-transparent text-brand border-l-2 border-brand'
              : 'text-textSecondary hover:text-text hover:bg-white/5 border-l-2 border-transparent'
          }`}
        >
          <Star size={13} /> Favorites
          <span className="ml-auto text-[10px] text-textSecondary/60">{favCount}</span>
        </button>

        <div className="pt-3 pb-1 px-3 flex items-center justify-between">
          <span className="text-[10px] text-textSecondary uppercase tracking-wider font-semibold">Collections</span>
          <button
            onClick={onNewCollection}
            className="p-1 text-textSecondary hover:text-brand transition-all duration-150 hover:scale-[1.1]"
          >
            <FolderPlus size={12} />
          </button>
        </div>

        {collections.length === 0 && (
          <p className="text-[10px] text-textSecondary/50 px-3 py-2 text-center">
            No collections yet
          </p>
        )}

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
  const [searchQuery, setSearchQuery] = useState('')
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showCollection, setShowCollection] = useState(false)
  const [editingCollection, setEditingCollection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [theme, setThemeState] = useState(getTheme)
  const [sortBy, setSortBy] = useState('date-new')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [showSidebar, setShowSidebar] = useState(true)
  const [activeCollection, setActiveCollection] = useState(null)
  const [mobileCollectionsOpen, setMobileCollectionsOpen] = useState(false)
  const isMobile = useIsMobile()
  const { toasts, addToast, removeToast } = useToast()
  const fileInputRef = useRef(null)

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Load data
  useEffect(() => {
    setPhotos(getPhotos())
    setCollections(getCollections())
    setTimeout(() => setLoading(false), 600)
  }, [])

  // System theme detection
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        setThemeState(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Global keyboard shortcuts
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
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // ── Upload ──────────────────────────────────────────────────────────────
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

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDeletePhoto = useCallback((id) => {
    const updated = photos.filter(p => p.id !== id)
    setPhotos(updated)
    savePhotos(updated)
    if (lightboxPhoto?.id === id) setLightboxPhoto(null)
    addToast('Photo deleted')
  }, [photos, lightboxPhoto, addToast])

  // ── Batch Delete ────────────────────────────────────────────────────────
  const handleBatchDelete = useCallback(() => {
    const updated = photos.filter(p => !selected.has(p.id))
    setPhotos(updated)
    savePhotos(updated)
    setSelected(new Set())
    setBatchMode(false)
    addToast(`${selected.size} photos deleted`)
  }, [photos, selected, addToast])

  // ── Batch Add to Collection ─────────────────────────────────────────────
  const handleBatchAddToCollection = useCallback((collectionId) => {
    const updated = photos.map(p => selected.has(p.id) ? { ...p, collectionId } : p)
    setPhotos(updated)
    savePhotos(updated)
    setSelected(new Set())
    setBatchMode(false)
    addToast(collectionId ? 'Moved to collection' : 'Removed from collection')
  }, [photos, selected, addToast])

  // ── Collection CRUD ──────────────────────────────────────────────────────
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
    if (activeCollection === id) setActiveCollection(null)
    addToast('Collection deleted')
  }, [collections, photos, activeCollection, addToast])

  const handleAddToCollection = useCallback((photoId, collectionId) => {
    const updated = photos.map(p => p.id === photoId ? { ...p, collectionId } : p)
    setPhotos(updated)
    savePhotos(updated)
    addToast(collectionId ? 'Photo added to collection' : 'Photo removed from collection')
  }, [photos, addToast])

  const handleSetCover = useCallback((collectionId, photoId) => {
    if (!photoId) return
    const updated = collections.map(c => c.id === collectionId ? { ...c, coverPhotoId: photoId } : c)
    setCollections(updated)
    saveCollections(updated)
    addToast('Cover updated')
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
    navigator.clipboard.writeText(photo.dataUrl).then(() => toastAdd('Link copied!'))
      .catch(() => toastAdd('Copy failed'))
  }, [])

  // ── Filtering + Sorting ────────────────────────────────────────────────
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
        case 'name-az':  return (a.note || '').localeCompare(b.note || '')
        case 'name-za':  return (b.note || '').localeCompare(a.note || '')
        case 'size-desc':return (b.fileSize || 0) - (a.fileSize || 0)
        case 'size-asc': return (a.fileSize || 0) - (b.fileSize || 0)
        default: return 0
      }
    })

    return result
  }, [photos, searchQuery, sortBy, activeCollection, collections])

  const lightboxPhotos = filteredPhotos
  const lightboxIndex = lightboxPhotos.findIndex(p => p.id === lightboxPhoto?.id)
  const handleLightboxNext = () => setLightboxPhoto(lightboxPhotos[(lightboxIndex + 1) % lightboxPhotos.length])
  const handleLightboxPrev = () => setLightboxPhoto(lightboxPhotos[(lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length])

  // Active collection label
  const activeLabel = useMemo(() => {
    if (activeCollection === '__favorites__') return 'Favorites'
    if (activeCollection !== null) return collections.find(c => c.id === activeCollection)?.name || 'Collection'
    return 'All Photos'
  }, [activeCollection, collections])

  return (
    <div className="min-h-screen pb-24 bg-bg text-text transition-colors duration-200">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 glass-nav transition-colors duration-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo + sidebar toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => isMobile ? setMobileCollectionsOpen(true) : setShowSidebar(s => !s)}
                className="p-2.5 text-textSecondary hover:text-text hover:bg-white/10 rounded-btn transition-all duration-150 active:scale-95"
              >
                <Menu size={18} />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-btn bg-card border border-border flex items-center justify-center">
                  <Images size={13} className="text-brand" />
                </div>
                <span className="text-sm font-semibold text-text tracking-tight hidden sm:block">
                  gallery<span className="text-brand">.</span>
                </span>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                className="p-2 text-textSecondary hover:text-text hover:bg-white/10 rounded-btn transition-all duration-150 hover:scale-[1.05]"
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button
                onClick={() => setBatchMode(b => !b)}
                className={`p-2 rounded-btn transition-all duration-150 hover:scale-[1.05] ${
                  batchMode
                    ? 'bg-brand text-white'
                    : 'text-textSecondary hover:text-text hover:bg-white/10'
                }`}
                title="Batch select"
              >
                <Filter size={15} />
              </button>
              {!isMobile && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-3 py-1.5 bg-brand hover:bg-brand-light text-white text-xs font-medium rounded-btn transition-all duration-200 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus size={14} /> Upload
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="pb-3">
            <div className="relative max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search photos and collections..."
                className="w-full bg-card border border-border rounded-btn pl-9 pr-3 py-2 text-xs text-text placeholder-textSecondary/50 focus:outline-none focus:border-brand/50 transition-colors duration-150"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-text transition-colors duration-150 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Filter chips */}
          {!isMobile && (
            <div className="pb-3">
              <FilterChips
                activeCollection={activeCollection}
                collections={collections}
                onSelect={setActiveCollection}
                photos={photos}
              />
            </div>
          )}
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 flex gap-4">
        {/* Sidebar */}
        <div className={isMobile ? 'hidden' : ''}>
          <Sidebar
            collections={collections}
            photos={photos}
            activeCollection={activeCollection}
            onSelectCollection={setActiveCollection}
            onNewCollection={() => { setEditingCollection(null); setShowCollection(true) }}
            onEditCollection={col => { setEditingCollection(col); setShowCollection(true) }}
            onDeleteCollection={handleDeleteCollection}
            onSetCover={colId => {
              setActiveCollection(colId)
              addToast('Click a photo, then tap cover icon')
            }}
            showSidebar={showSidebar}
            onToggleSidebar={() => setShowSidebar(s => !s)}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-textSecondary">
              <span className="uppercase tracking-wider font-semibold text-[11px]">
                {activeLabel}
              </span>
              <span>({filteredPhotos.length})</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowSortMenu(m => !m)}
                className="px-3 py-1.5 glass-card rounded-btn text-xs text-textSecondary hover:text-text transition-all duration-150 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
              >
                Sort <ChevronDown size={11} />
              </button>
              {showSortMenu && (
                <div className="absolute top-full right-0 mt-1 glass-card rounded-card p-1 shadow-xl z-30 min-w-[140px] animate-scale-in">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setSortBy(opt.id); setShowSortMenu(false) }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-btn transition-colors duration-150 flex items-center justify-between ${
                        sortBy === opt.id
                          ? 'text-brand bg-brand/10'
                          : 'text-text hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                      {sortBy === opt.id && <Check size={10} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Loading skeletons */}
          {loading ? (
            <div className="masonry">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="masonry-item">
                  <div
                    className="bg-card rounded-card skeleton"
                    style={{ height: `${Math.floor(Math.random() * 180) + 100}px` }}
                  />
                </div>
              ))}
            </div>
          ) : filteredPhotos.length === 0 ? (
            activeCollection === '__favorites__' ? (
              <EmptyState type="favorites" />
            ) : searchQuery ? (
              <EmptyState type="search" />
            ) : activeCollection !== null && activeCollection !== '__favorites__' ? (
              <EmptyState type="collection" onAction={() => setShowUpload(true)} />
            ) : (
              <EmptyState type="photos" onAction={() => setShowUpload(true)} />
            )
          ) : (
            <div className="masonry">
              {filteredPhotos.map((photo, i) => (
                <div key={photo.id} className="animate-card-appear" style={{ animationDelay: `${i * 40}ms` }}>
                  <PhotoCard
                    photo={photo}
                    collections={collections}
                    onOpen={setLightboxPhoto}
                    onAddToCollection={handleAddToCollection}
                    isSelected={selected.has(photo.id)}
                    onToggleSelect={id => {
                      setSelected(s => {
                        const next = new Set(s)
                        next.has(id) ? next.delete(id) : next.add(id)
                        return next
                      })
                    }}
                    onSetCover={photoId => {
                      if (activeCollection && activeCollection !== '__favorites__') {
                        handleSetCover(activeCollection, photoId)
                      }
                    }}
                    onToggleFavorite={handleToggleFavorite}
                    showCheckbox={batchMode}
                    animIndex={i}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Batch Actions Bar */}
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
        <LightboxComponent
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
          currentCollectionId={
            activeCollection !== null && activeCollection !== '__favorites__'
              ? activeCollection
              : undefined
          }
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

      {/* FAB: mobile only */}
      {isMobile && (
        <FAB onClick={() => setShowUpload(true)} />
      )}

      {/* Mobile Collections Bottom Sheet */}
      <MobileCollectionsSheet
        isOpen={mobileCollectionsOpen}
        onClose={() => setMobileCollectionsOpen(false)}
        collections={collections}
        photos={photos}
        activeCollection={activeCollection}
        onSelect={colId => { setActiveCollection(colId); setMobileCollectionsOpen(false) }}
      />

      {/* Toast */}
      <div className={`fixed z-[100] flex flex-col gap-2 pointer-events-none ${isMobile ? 'bottom-24 left-4 right-4' : 'bottom-6 right-6'}`}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="glass-toast px-4 py-3 rounded-btn text-xs flex items-center gap-3 text-text shadow-xl pointer-events-auto animate-scale-in"
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-textSecondary hover:text-text transition-colors duration-150"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
