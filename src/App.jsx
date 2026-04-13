import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Images, FolderOpen, X, Upload, ChevronLeft, ChevronRight, StickyNote, Trash2, Edit3, Check, Layers } from 'lucide-react'
import { getPhotos, savePhotos, getCollections, saveCollections, generateId } from './utils/storage'
import { useToast } from './hooks/useToast'

const Toast = ({ toasts, removeToast }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
    {toasts.map(toast => (
      <div
        key={toast.id}
        className={`glass px-5 py-3 rounded-2xl flex items-center gap-3 animate-slide-up shadow-lg ${
          toast.type === 'success' ? 'border border-emerald-500/20' :
          toast.type === 'error' ? 'border border-red-500/20' :
          'border border-nebula-400/20'
        }`}
      >
        <span className="text-sm font-medium text-slate-200">{toast.message}</span>
        <button onClick={() => removeToast(toast.id)} className="text-slate-500 hover:text-slate-300 transition-colors">
          <X size={14} />
        </button>
      </div>
    ))}
  </div>
)

const SkeletonCard = () => (
  <div className="masonry-item">
    <div className="skeleton rounded-2xl overflow-hidden" style={{ height: `${Math.floor(Math.random() * 200) + 150}px` }} />
  </div>
)

const EmptyState = ({ type, onAction }) => {
  if (type === 'photos') return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-32 h-32 rounded-full bg-cosmic-700/50 flex items-center justify-center mb-6 cosmic-glow">
        <Images size={48} className="text-nebula-400 opacity-60" />
      </div>
      <h3 className="text-xl font-semibold text-slate-200 mb-2">Your cosmic collection awaits</h3>
      <p className="text-slate-500 max-w-sm mb-8">Upload your first photo and start building your personal universe of memories.</p>
      <button onClick={onAction} className="px-6 py-3 bg-nebula-400/20 hover:bg-nebula-400/30 border border-nebula-400/30 text-nebula-400 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-nebula-400/20 flex items-center gap-2">
        <Plus size={18} /> Upload Photo
      </button>
    </div>
  )
  if (type === 'collections') return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-32 h-32 rounded-full bg-cosmic-700/50 flex items-center justify-center mb-6 cosmic-glow">
        <FolderOpen size={48} className="text-stellar-400 opacity-60" />
      </div>
      <h3 className="text-xl font-semibold text-slate-200 mb-2">No collections yet</h3>
      <p className="text-slate-500 max-w-sm mb-8">Create collections to organize your photos into beautiful albums.</p>
      <button onClick={onAction} className="px-6 py-3 bg-stellar-400/20 hover:bg-stellar-400/30 border border-stellar-400/30 text-stellar-400 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-stellar-400/20 flex items-center gap-2">
        <Plus size={18} /> Create Collection
      </button>
    </div>
  )
  if (type === 'search') return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-24 h-24 rounded-full bg-cosmic-700/50 flex items-center justify-center mb-6">
        <Search size={36} className="text-slate-600" />
      </div>
      <h3 className="text-lg font-medium text-slate-400 mb-1">No results found</h3>
      <p className="text-slate-600">Try searching with different keywords</p>
    </div>
  )
  return null
}

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
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors" onClick={onClose}>
        <X size={28} />
      </button>
      <button className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-2" onClick={(e) => { e.stopPropagation(); onPrev() }}>
        <ChevronLeft size={36} />
      </button>
      <button className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-2" onClick={(e) => { e.stopPropagation(); onNext() }}>
        <ChevronRight size={36} />
      </button>
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent" onClick={(e) => e.stopPropagation()}>
        <div className="max-w-3xl mx-auto flex items-end justify-between">
          <div>
            {photo.note && (
              <div className="flex items-start gap-3">
                <StickyNote size={16} className="text-nebula-400 mt-1 flex-shrink-0" />
                <p className="text-slate-300 text-sm">{photo.note}</p>
              </div>
            )}
            <p className="text-slate-600 text-xs mt-2">{currentIndex + 1} / {photos.length}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(photo.id) }} className="p-3 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <img
        src={photo.dataUrl}
        alt={photo.note || 'Photo'}
        className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="glass-card rounded-3xl w-full max-w-lg p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-200">Upload Photo</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all mb-4 ${
            dragActive ? 'border-nebula-400 bg-nebula-400/10' : 'border-cosmic-500 hover:border-cosmic-400'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-contain" />
          ) : (
            <>
              <Upload size={40} className="mx-auto mb-3 text-slate-500" />
              <p className="text-slate-400 mb-1">Drag & drop your photo here</p>
              <p className="text-slate-600 text-sm">or click to browse</p>
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
          placeholder="Add a note about this memory..."
          className="w-full bg-cosmic-700/50 border border-cosmic-600 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-nebula-400/50 transition-colors resize-none mb-4"
          rows={2}
        />
        {collections.length > 0 && (
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="w-full bg-cosmic-700/50 border border-cosmic-600 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-nebula-400/50 transition-colors mb-4"
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
          className="w-full py-3 bg-nebula-400 hover:bg-nebula-500 disabled:bg-cosmic-600 disabled:text-slate-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
        >
          <Check size={18} /> Save Photo
        </button>
      </div>
    </div>
  )
}

const CollectionModal = ({ onClose, onSave, collection }) => {
  const [name, setName] = useState(collection?.name || '')
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="glass-card rounded-3xl w-full max-w-md p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-200">{collection ? 'Edit Collection' : 'New Collection'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Collection name..."
          className="w-full bg-cosmic-700/50 border border-cosmic-600 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-nebula-400/50 transition-colors mb-4"
          autoFocus
        />
        <button
          onClick={() => name.trim() && onSave(name.trim())}
          disabled={!name.trim()}
          className="w-full py-3 bg-nebula-400 hover:bg-nebula-500 disabled:bg-cosmic-600 disabled:text-slate-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
        >
          <Check size={18} /> {collection ? 'Update' : 'Create'} Collection
        </button>
      </div>
    </div>
  )
}

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
    setTimeout(() => setLoading(false), 800)
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
    addToast('Photo uploaded to your cosmos', 'success')
  }, [photos, addToast])

  const handleDeletePhoto = useCallback((id) => {
    const updated = photos.filter(p => p.id !== id)
    setPhotos(updated)
    savePhotos(updated)
    setLightboxPhoto(null)
    addToast('Photo removed from your cosmos', 'success')
  }, [photos, addToast])

  const handleSaveCollection = useCallback((name) => {
    if (editingCollection) {
      const updated = collections.map(c => c.id === editingCollection.id ? { ...c, name } : c)
      setCollections(updated)
      saveCollections(updated)
      addToast('Collection updated', 'success')
    } else {
      const newCollection = { id: generateId(), name, createdAt: new Date().toISOString() }
      const updated = [newCollection, ...collections]
      setCollections(updated)
      saveCollections(updated)
      addToast('Collection created', 'success')
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
    addToast('Collection deleted', 'success')
  }, [collections, photos, addToast])

  const handleAddToCollection = useCallback((photoId, collectionId) => {
    const updatedPhotos = photos.map(p => p.id === photoId ? { ...p, collectionId } : p)
    setPhotos(updatedPhotos)
    savePhotos(updatedPhotos)
    addToast('Photo added to collection', 'success')
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

  const getCollectionPhotoCount = (collectionId) => photos.filter(p => p.collectionId === collectionId).length

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-nebula-400 to-stellar-400 flex items-center justify-center">
                <span className="text-lg">🌌</span>
              </div>
              <h1 className="text-lg font-semibold text-slate-200 tracking-tight">Cosmos Gallery</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUpload(true)}
                className="px-4 py-2 bg-nebula-400/20 hover:bg-nebula-400/30 border border-nebula-400/30 text-nebula-400 rounded-xl text-sm font-medium transition-all hover:shadow-lg hover:shadow-nebula-400/20 flex items-center gap-2"
              >
                <Plus size={16} /> Upload
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 pb-3 -mb-px">
            {[
              { id: 'photos', label: 'Photos', icon: Images, count: photos.length },
              { id: 'collections', label: 'Collections', icon: Layers, count: collections.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'text-nebula-400 border-nebula-400'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                <tab.icon size={14} className="inline mr-2" />
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search photos and collections..."
            className="w-full bg-cosmic-800/80 border border-cosmic-600/50 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-nebula-400/50 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X size={16} />
            </button>
          )}
        </div>

        {activeTab === 'photos' && (
          <>
            {loading ? (
              <div className="masonry">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredPhotos.length === 0 ? (
              searchQuery ? (
                <EmptyState type="search" />
              ) : (
                <EmptyState type="photos" onAction={() => setShowUpload(true)} />
              )
            ) : (
              <div className="masonry">
                {filteredPhotos.map((photo) => {
                  const col = collections.find(c => c.id === photo.collectionId)
                  return (
                    <div key={photo.id} className="masonry-item group cursor-pointer" onClick={() => setLightboxPhoto(photo)}>
                      <div className="relative overflow-hidden rounded-2xl glass-card cosmic-glow transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-nebula-400/20">
                        <img src={photo.dataUrl} alt={photo.note || 'Photo'} className="w-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        {photo.note && (
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur flex items-center justify-center">
                              <StickyNote size={12} className="text-nebula-400" />
                            </div>
                          </div>
                        )}
                        {col && (
                          <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="px-2 py-1 bg-black/50 backdrop-blur rounded-lg text-xs text-slate-300">{col.name}</span>
                          </div>
                        )}
                        {collections.length > 0 && !photo.collectionId && (
                          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <select
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleAddToCollection(photo.id, e.target.value || null)}
                              className="bg-black/50 backdrop-blur border border-white/20 rounded-lg px-2 py-1 text-xs text-slate-300 cursor-pointer"
                              value=""
                            >
                              <option value="">+ Add to collection</option>
                              {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'collections' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">{filteredCollections.length} collections</p>
              <button
                onClick={() => { setEditingCollection(null); setShowCollection(true) }}
                className="px-4 py-2 bg-stellar-400/20 hover:bg-stellar-400/30 border border-stellar-400/30 text-stellar-400 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
              >
                <Plus size={14} /> New
              </button>
            </div>
            {filteredCollections.length === 0 ? (
              <EmptyState type="collections" onAction={() => { setEditingCollection(null); setShowCollection(true) }} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCollections.map(collection => {
                  const coverPhoto = photos.find(p => p.collectionId === collection.id)
                  const count = getCollectionPhotoCount(collection.id)
                  return (
                    <div key={collection.id} className="glass-card rounded-2xl overflow-hidden glow-hover group">
                      <div className="h-36 bg-cosmic-700/50 relative">
                        {coverPhoto ? (
                          <img src={coverPhoto.dataUrl} alt={collection.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FolderOpen size={40} className="text-cosmic-500" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-cosmic-800 to-transparent" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-slate-200">{collection.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{count} {count === 1 ? 'photo' : 'photos'}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingCollection(collection); setShowCollection(true) }}
                              className="p-2 text-slate-500 hover:text-slate-300 hover:bg-cosmic-600/50 rounded-lg transition-all"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCollection(collection.id)}
                              className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {count > 0 && (
                          <button
                            onClick={() => { setSearchQuery(collection.name); setActiveTab('photos') }}
                            className="mt-3 w-full py-2 bg-cosmic-600/50 hover:bg-cosmic-600 text-slate-400 hover:text-slate-300 rounded-xl text-xs font-medium transition-all"
                          >
                            View Collection
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

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
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={handleUpload} collections={collections} />}
      {showCollection && <CollectionModal onClose={() => { setShowCollection(false); setEditingCollection(null) }} onSave={handleSaveCollection} collection={editingCollection} />}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default App
