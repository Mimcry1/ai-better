import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Edit2, Trash2, ChevronLeft, MessageSquarePlus, Loader2 } from 'lucide-react';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatMessage } from './components/ChatMessage';
import { Modal } from './components/Modal';
import type { Chat, Message } from './types';

function App() {
  // --- Chat State ---
  const [chats, setChats] = useState<Chat[]>(() => {
    const savedChats = localStorage.getItem('chats');
    return savedChats ? JSON.parse(savedChats) : [];
  });
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [newChatName, setNewChatName] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Load/Save Chats ---
  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  // --- Chat Functions ---
  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const createNewChat = (firstMessage?: Message) => {
    const newChat: Chat = {
      id: Date.now().toString(),
      name: 'New Chat',
      messages: firstMessage ? [firstMessage] : [],
      createdAt: Date.now(),
    };
    setChats(prev => [...prev, newChat]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: Date.now(),
    };

    let chatId = currentChatId || createNewChat(userMessage);
    setInput('');
    setIsThinking(true);

    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "You are a helpful health AI assistant...",
            },
            ...(chats.find(chat => chat.id === chatId)?.messages || []).map(msg => ({
              role: msg.isUser ? "user" : "assistant",
              content: msg.content
            })),
            {
              role: "user",
              content: input,
            }
          ]
        }),
      });

      const data = await response.json();
      const aiMessage: Message = {
        id: data.id,
        content: data.choices[0].message.content,
        isUser: false,
        timestamp: Date.now(),
      };

      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === chatId ? { ...chat, messages: [...chat.messages, aiMessage] } : chat
        )
      );
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsThinking(false);
    }
  };

  const handleRenameChat = (chatId: string, newChatName: string) => {
    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId ? { ...chat, name: newChatName } : chat
      )
    );
    setIsRenameModalOpen(false);
    setSelectedChatId(null);
  };

  const handleDeleteChat = (chatId: string) => {
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
    setIsDeleteModalOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen">
      <ChatSidebar
        chats={chats}
        currentChatId={currentChatId}
        isCollapsed={isSidebarCollapsed}
        onNewChat={() => createNewChat()}
        onSelectChat={handleSelectChat}
        onRenameChat={(chatId) => {
          setSelectedChatId(chatId);
          setIsRenameModalOpen(true);
        }}
        onDeleteChat={(chatId) => {
          setSelectedChatId(chatId);
          setIsDeleteModalOpen(true);
        }}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div className={`flex-1 flex flex-col bg-gray-900 text-gray-200 relative overflow-hidden ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Top Bar */}
        <div className="flex items-center justify-between h-12 bg-gray-900 border-b border-gray-700 text-gray-300 px-4">
          <div className="flex-1 text-center">
            {currentChatId ? (
              chats.find(chat => chat.id === currentChatId)?.name
            ) : (
              <span className="text-gray-500">Select or start a chat</span>
            )}
          </div>
        </div>

        {/* Message List Area */}
        <div className="flex-1 overflow-y-auto p-4" ref={chatBoxRef}>
          {currentChatId && chats.find(chat => chat.id === currentChatId)?.messages.map((message) => (
            <ChatMessage key={message.id} message={message} content={message.content} />
          ))}
          {isThinking && (
            <div className="message ai-message">
              <Loader2 className="animate-spin w-5 h-5 text-gray-400" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-700 bg-gray-900">
          <div className="flex items-center space-x-2">
            <textarea
              ref={textareaRef}
              className="flex-1 p-2 border border-gray-600 bg-gray-800 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-y-hidden placeholder-gray-400"
              placeholder="Type your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{ maxHeight: '200px' }}
            />
            <button
              className="bg-[#6dde4e] hover:bg-[#52be34] text-white p-2 rounded-lg"
              onClick={handleSendMessage}
              disabled={!input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Rename Modal */}
      <Modal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        title="Rename Chat"
      >
        <input
          type="text"
          className="chat-name-input mb-4"
          value={newChatName}
          onChange={(e) => setNewChatName(e.target.value)}
          placeholder="Enter new chat name"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleRenameChat(selectedChatId!, newChatName);
            }
          }}
        />
        <div className="flex justify-end space-x-2">
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
            onClick={() => setIsRenameModalOpen(false)}
          >
            Cancel
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => handleRenameChat(selectedChatId!, newChatName)}
          >
            OK
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Delete"
      >
        <p>Are you sure you want to delete this chat?</p>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
            onClick={() => setIsDeleteModalOpen(false)}
          >
            Cancel
          </button>
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            onClick={() => handleDeleteChat(selectedChatId!)}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default App;
