import API from '../config/api'

/**
 * POST a file to Cloudinary via the generic media route.
 * Returns { url, filename } from the media route.
 */
export default async function uploadMedia(file, folder) {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${API}/api/media/upload/${folder}`, {
    method: 'POST',
    body: form,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) {
    throw new Error(data.error || `Upload failed (${res.status})`)
  }
  return data
}
