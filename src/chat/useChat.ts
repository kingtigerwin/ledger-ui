import { use } from 'react'
import { ChatContext } from './context'

export function useChat() {
  const chat = use(ChatContext)
  if (!chat) throw new Error('useChat must be used inside <ChatProvider>')
  return chat
}
