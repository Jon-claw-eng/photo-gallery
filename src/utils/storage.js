const STORAGE_KEYS = {
  PHOTOS: 'cosmos_photos',
  COLLECTIONS: 'cosmos_collections',
}

export const getPhotos = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PHOTOS)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export const savePhotos = (photos) => {
  localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(photos))
}

export const getCollections = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COLLECTIONS)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export const saveCollections = (collections) => {
  localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections))
}

export const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
