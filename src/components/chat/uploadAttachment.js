import API from '../../config/api'

/**
 * POST a file to the chat-attachments folder, reporting upload progress.
 *
 * fetch() has no upload-progress event, so this uses XMLHttpRequest — the
 * progress ring over the attachment preview is the whole point of the
 * WhatsApp-style upload state.
 *
 * Returns { url, ... } from the media route and exposes `abort` on the promise
 * so a cancelled preview doesn't keep uploading in the background.
 */
export default function uploadAttachment(file, onProgress) {
  const xhr = new XMLHttpRequest()

  const promise = new Promise((resolve, reject) => {
    xhr.open('POST', `${API}/api/media/upload/chat-attachments`)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }

    xhr.onload = () => {
      let data = {}
      try { data = JSON.parse(xhr.responseText || '{}') } catch { /* non-JSON error page */ }
      if (xhr.status >= 200 && xhr.status < 300 && data.url) {
        onProgress?.(1)
        resolve(data)
      } else {
        reject(new Error(data.error || `Upload failed (${xhr.status})`))
      }
    }

    xhr.onerror   = () => reject(new Error('Network error during upload'))
    xhr.onabort   = () => reject(Object.assign(new Error('Upload cancelled'), { aborted: true }))
    xhr.ontimeout = () => reject(new Error('Upload timed out'))

    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })

  promise.abort = () => xhr.abort()
  return promise
}
