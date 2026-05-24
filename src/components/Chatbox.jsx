import React from 'react'
import '../styles/components/Chatbox.css' 

export default function Chatbox() {
  return (
    <section className="chatbox">
      <div className="chatbox__messages">No messages yet.</div>
      <div className="chatbox__input">
        <input type="text" placeholder="Write a message..." />
        <button>Send</button>
      </div>
    </section>
  )
}
