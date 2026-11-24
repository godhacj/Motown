import React, { useState } from 'react'
import { FiTrash2, FiMessageSquare } from 'react-icons/fi'
import { useAdminAuth } from '../../../contexts/AdminAuthContext'
import { Modal, Button, Empty } from '../../../components/admin/AdminKit'
import { formatDate } from '../../../components/admin/adminUtils'

// Lists an item's comments and lets the Media admin remove any of them.
export default function CommentsModal({ endpoint, item, notify, onClose, onChange }) {
  const { apiFetch } = useAdminAuth()
  const [busy, setBusy] = useState(null)
  const comments = [...(item.comments || [])].reverse()

  const remove = async (cid) => {
    setBusy(cid)
    try {
      const saved = await apiFetch(`${endpoint}/comments/${cid}`, { method: 'DELETE' })
      onChange(saved)
      notify('success', 'Comment removed')
    } catch (err) { notify('error', err.message) } finally { setBusy(null) }
  }

  return (
    <Modal title="Comments" subtitle={item.title} onClose={onClose} width={520}>
      {!comments.length ? <Empty icon={FiMessageSquare} text="No comments yet" /> : (
        <div className="ak-comments">
          {comments.map((c) => (
            <div key={c._id} className="ak-comment">
              <div>
                <strong>{c.authorName}</strong>
                <p>{c.text}</p>
                <small>{formatDate(c.createdAt)}</small>
              </div>
              <Button size="sm" variant="danger-ghost" disabled={busy === c._id} onClick={() => remove(c._id)} aria-label="Remove comment">
                <FiTrash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
