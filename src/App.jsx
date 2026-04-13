import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Images, FolderOpen, X, Upload, ChevronLeft, ChevronRight, StickyNote, Trash2, Edit3, Check, Layers, FolderPlus } from 'lucide-react'
import { getPhotos, savePhotos, getCollections, saveCollections, generateId } from './utils/storage'
import { useToast } from './hooks/useToast'

// ─── Toast ───────────────────────────────────────────────────────────────────
const Toast = ({ toasts, removeToast }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
    {toasts.map(toast => (
      <div
        key={toast.id}
        className="px-4 py-3 rounded-card border text-sm flex items-center gap-3 bg-surface border-border text-text"
      >
        <span>{toast.message}</span>
        <button onClick={() => removeToast(toast.id)} className="text-textSecondary hover:text-text transition-colors duration-150">
          <X size={14} />
        </button>
      </div>
    ))}
  </div>
)

// ─── Empty State ─────────────────────────────────────────────────────────────
const EmptyState = ({ type, onAction }) => {
  const configs = {
    photos: {
      icon: Images,
      title: 'No photos yet',
      desc: 'Upload your first photo to get started.',
      action: 'Upload Photo',
    },
    collections: {
      icon: FolderOpen,
      title: 'No collections',
      desc: 'Create collections to organize your photos.',
      action: 'New Collection',
    },
    search: {
      icon: Search,
      title: 'No results',
      desc: 'Try searching with different keywords.',
      action: null,
    },
  }
  const c = configs[type]
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-12 h-12 rounded-card bg-card flex items-center justify-center mb-4">
        <c.icon size={20} className="text-textSecondary" />
      </div>
      <h3 className="text-sm font-semibold text-text mb-1">{c.title}</h3>
      <p className="text-xs text-textSecondary mb-6 max-w-xs">{c.desc}</p>
      {c.action && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-medium bg-accent hover:bg-accent/90 text-white rounded-btn transition-colors duration-150 flex items-center gap-1.5"
        >
          <Plus size={14} /> {c.action}
        </button>
      )}
    </div>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
const Lightbox = ({ photo, photos, onClose, onNext, onPrev, onDelete }) => {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onNext()
      if (e.key === 'ArrowLeft') onPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, onNext, onPrev])

  const currentIndex = photos.findIndex(p => p.id === photo.id)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-textSecondary hover:text-text transition-colors duration-150 p-2 rounded-btn"
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary hover:text-text transition-colors duration-150 p-2 rounded-btn"
        onClick={(e) => { e.stopPropagation(); onPrev() }}
      >
        <ChevronLeft size={28} />
      </button>
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 text-textSecondary hover:text-text transition-colors duration-150 p-2 rounded-btn"
        onClick={(e) => { e.stopPropagation(); onNext() }}
      >
        <ChevronRight size={28} />
      </button>

      <img
        src={photo.dataUrl}
        alt={photo.note || 'Photo'}
        className="max-w-[90vw] max-h-[80vh] object-contain rounded-modal bg-card animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      />

      <div
        className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-border bg-surface/80 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-3xl mx-auto flex items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            {photo.note && (
              <div className="flex items-start gap-2 mb-2">
                <StickyNote size={13} className="text-textSecondary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-textSecondary">{photo.note}</p>
              </div>
            )}
            <p className="text-xs text-textSecondary/60">{currentIndex + 1} / {photos.length}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(photo.id) }}
            className="p-2 text-textSecondary hover:text-red-400 hover:bg-red-400/10 rounded-btn transition-all duration-150 flex-shrink-0"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
const UploadModal = ({ onClose, onUpload, collections }) => {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState(null)
  const [note, setNote] = useState('')
  const [selectedCollection, setSelectedCollection] = useState('')

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleSubmit = () => {
    if (!preview) return
    onUpload({ dataUrl: preview, note, collectionId: selectedCollection || null })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-modal w-full max-w-md p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-text tracking-wide">Upload Photo</h2>
          <button onClick={onClose} className="text-textSecondary hover:text-text transition-colors duration-150 p-1">
            <X size={16} />
          </button>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-card p-8 text-center transition-all duration-150 mb-4 ${
            dragActive
              ? 'border-accent bg-accent/5'
              : 'border-border hover:border-borderHover'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-btn object-contain" />
          ) : (
            <>
              <Upload size={24} className="mx-auto mb-3 text-textSecondary" />
              <p className="text-xs text-textSecondary mb-1">Drag & drop or click to browse</p>
              <p className="text-xs text-textSecondary/50">PNG, JPG, GIF, WEBP</p>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => handleFile(e.target.files[0])}
          />
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
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
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
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-modal w-full max-w-sm p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-text tracking-wide">
            {collection ? 'Edit Collection' : 'New Collection'}
          </h2>
          <button onClick={onClose} className="text-textSecondary hover:text-text transition-colors duration-150 p-1">
            <X size={16} />
          </button>
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

// ─── Photo Card ───────────────────────────────────────────────────────────────
const PhotoCard = ({ photo, collections, onOpen, onAddToCollection }) => {
  const col = collections.find(c => c.id === photo.collectionId)

  return (
    <div className="masonry-item group cursor-pointer" onClick={onOpen}>
      <div className="relative overflow-hidden rounded-card border border-border transition-all duration-150 group-hover:border-borderHover group-hover:scale-[1.02]">
        <img
          src={photo.dataUrl}
          alt={photo.note || 'Photo'}
          className="w-full object-cover block"
          loading="lazy"
        />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="absolute top-2 right-2">
            {photo.note && (
              <div className="w-6 h-6 rounded-btn bg-black/70 flex items-center justify-center">
                <StickyNote size={11} className="text-textSecondary" />
              </div>
            )}
          </div>
          {col && (
            <div className="absolute bottom-2 left-2">
              <span className="px-1.5 py-1 bg-black/70 rounded-btn text-[10px] text-textSecondary">{col.name}</span>
            </div>
          )}
          {!photo.collectionId && collections.length > 0 && (
            <div className="absolute bottom-2 right-2">
              <select
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onAddToCollection(photo.id, e.target.value || null)}
                className="bg-black/70 border border-borderHover rounded-btn px-1.5 py-1 text-[10px] text-textSecondary cursor-pointer"
                value=""
              >
                <option value="">+ Collection</option>
                {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Collection Card ─────────────────────────────────────────────────────────
const CollectionCard = ({ collection, photos, onEdit, onDelete, onView }) => {
  const count = photos.filter(p => p.collectionId === collection.id).length
  const coverPhoto = photos.find(p => p.collectionId === collection.id)

  return (
    <div className="border border-border rounded-card overflow-hidden hover:border-borderHover transition-all duration-150 group">
      <div className="h-32 bg-card relative">
        {coverPhoto ? (
          <img src={coverPhoto.dataUrl} alt={collection.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen size={24} className="text-textSecondary/30" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-medium text-text truncate">{collection.name}</h3>
            <p className="text-[11px] text-textSecondary mt-0.5">{count} {count === 1 ? 'photo' : 'photos'}</p>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 text-textSecondary hover:text-text hover:bg-card rounded-btn transition-all duration-150"
            >
              <Edit3 size={12} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-textSecondary hover:text-red-400 hover:bg-red-400/10 rounded-btn transition-all duration-150"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        {count > 0 && (
          <button
            onClick={onView}
            className="mt-2.5 w-full py-1.5 bg-card hover:bg-border text-[11px] text-textSecondary hover:text-text rounded-btn transition-all duration-150"
          >
            View
          </button>
        )}
      </div>
    </div>
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
  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    setPhotos(getPhotos())
    setCollections(getCollections())
    setTimeout(() => setLoading(false), 500)
  }, [])

  const handleUpload = useCallback(({ dataUrl, note, collectionId }) => {
    const newPhoto = {
      id: generateId(),
      dataUrl,
      note,
      collectionId,
      createdAt: new Date().toISOString(),
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
    const updatedPhotos = photos.map(p => p.id === photoId ? { ...p, collectionId } : p)
    setPhotos(updatedPhotos)
    savePhotos(updatedPhotos)
    addToast('Photo updated')
  }, [photos, addToast])

  const filteredPhotos = photos.filter(p => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    if (p.note?.toLowerCase().includes(q)) return true
    const col = collections.find(c => c.id === p.collectionId)
    if (col?.name.toLowerCase().includes(q)) return true
    return false
  })

  const filteredCollections = collections.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const lightboxPhotos = filteredPhotos
  const lightboxIndex = lightboxPhotos.findIndex(p => p.id === lightboxPhoto?.id)
  const handleLightboxNext = () => setLightboxPhoto(lightboxPhotos[(lightboxIndex + 1) % lightboxPhotos.length])
  const handleLightboxPrev = () => setLightboxPhoto(lightboxPhotos[(lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length])

  return (
    <div className="min-h-screen pb-12 bg-bg text-text">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-btn bg-card border border-border flex items-center justify-center">
                <Images size={14} className="text-textSecondary" />
              </div>
              <span className="text-sm font-semibold text-text tracking-tight">Gallery</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUpload(true)}
                className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-medium rounded-btn transition-colors duration-150 flex items-center gap-1.5"
              >
                <Plus size={14} /> Upload
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0 -mb-px">
            {[
              { id: 'photos', label: 'Photos', icon: Images, count: photos.length },
              { id: 'collections', label: 'Collections', icon: Layers, count: collections.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-xs font-medium transition-all duration-150 border-b-2 ${
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        {/* ── Search ── */}
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search photos and collections..."
            className="w-full bg-card border border-border rounded-btn pl-9 pr-3 py-2.5 text-xs text-text placeholder-textSecondary/50 focus:outline-none focus:border-borderHover transition-colors duration-150"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-text transition-colors duration-150 p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* ── Photos Tab ── */}
        {activeTab === 'photos' && (
          loading ? (
            <div className="masonry">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="masonry-item">
                  <div
                    className="bg-card rounded-card animate-pulse"
                    style={{ height: `${Math.floor(Math.random() * 160) + 120}px` }}
                  />
                </div>
              ))}
            </div>
          ) : filteredPhotos.length === 0 ? (
            searchQuery ? (
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
                  onOpen={() => setLightboxPhoto(photo)}
                  onAddToCollection={handleAddToCollection}
                />
              ))}
            </div>
          )
        )}

        {/* ── Collections Tab ── */}
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
                    onEdit={() => { setEditingCollection(collection); setShowCollection(true) }}
                    onDelete={() => handleDeleteCollection(collection.id)}
                    onView={() => { setSearchQuery(collection.name); setActiveTab('photos') }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          photos={lightboxPhotos}
          onClose={() => setLightboxPhoto(null)}
          onNext={handleLightboxNext}
          onPrev={handleLightboxPrev}
          onDelete={handleDeletePhoto}
        />
      )}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
          collections={collections}
        />
      )}
      {showCollection && (
        <CollectionModal
          onClose={() => { setShowCollection(false); setEditingCollection(null) }}
          onSave={handleSaveCollection}
          collection={editingCollection}
        />
      )}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default App
