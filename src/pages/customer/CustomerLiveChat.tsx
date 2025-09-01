import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { MessageCircle, Send } from '../../utils/icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import socketService from '../../services/socketService';

interface Message {
  _id?: string;
  sender: { name: string; email?: string; };
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  isRead: boolean;
  createdAt: string;
}

interface Chat {
  _id: string;
  customer: { name: string; email?: string; phone?: string; sessionId: string; };
  assignedTo?: { _id: string; name: string; email: string; };
  status: 'waiting' | 'active' | 'resolved' | 'closed';
  subject?: string;
  category: 'general' | 'service' | 'billing' | 'technical' | 'complaint' | 'other';
  messages: Message[];
  createdAt: string;
}

export default function CustomerLiveChat() {
  const { user } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Track processed message IDs to prevent duplicates
  const processedMessageIds = useRef<Set<string>>(new Set());
  const socketConnected = useRef(false);

  // Memoized function to check if message is from current user
  const isCurrentUserMessage = useCallback((senderName: string) => {
    return user && senderName === user.name;
  }, [user]);

  // Memoized function to handle new messages
  const handleNewMessage = useCallback((data: any) => {
    if (!chat || data.chatId !== chat._id) return;

    console.log('🔔 Customer Socket: Received new message:', {
      chatId: data.chatId,
      messageContent: data.message.content,
      sender: data.message.sender.name,
      messageId: data.message._id
    });

    // Enhanced duplicate prevention with better logging
    const messageId = data.message._id || `${data.message.content}_${data.message.sender.name}_${data.message.createdAt}`;
    
    if (processedMessageIds.current.has(messageId)) {
      console.log('🚫 Customer Socket: Message already processed, skipping duplicate:', messageId);
      return;
    }
    
    // Mark message as processed
    processedMessageIds.current.add(messageId);
    console.log('✅ Customer Socket: Message marked as processed:', messageId);
    
    // Add new message to current chat
    setChat(prev => {
      if (!prev) return null;
      
      // Additional safety check - ensure message doesn't already exist
      const messageExists = prev.messages.some(msg => {
        if (msg._id && data.message._id && msg._id === data.message._id) {
          console.log('🚫 Customer Socket: Message with same ID already exists:', msg._id);
          return true;
        }
        if (msg.content === data.message.content && 
            msg.sender.name === data.message.sender.name &&
            Math.abs(new Date(msg.createdAt).getTime() - new Date(data.message.createdAt).getTime()) < 1000) {
          console.log('🚫 Customer Socket: Message with same content/sender/timestamp already exists');
          return true;
        }
        return false;
      });
      
      if (messageExists) {
        console.log('🚫 Customer Socket: Message already exists in chat, skipping duplicate');
        return prev;
      }
      
      console.log('✅ Customer Socket: Adding new message to chat:', data.message.content);
      return {
        ...prev,
        messages: [...prev.messages, data.message]
      };
    });
  }, [chat, user]);

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to use chat');
      return;
    }
    
    // Connect to socket only if not already connected
    if (!socketConnected.current) {
      socketService.connect();
      socketConnected.current = true;
    }
    
    // Load existing chats when component mounts
    loadExistingChats();

    // Set up socket listeners
    const unsubscribeMessage = socketService.onMessage(handleNewMessage);

    const unsubscribeConnection = socketService.onConnection((connected) => {
      setIsConnected(connected);
      if (connected) {
        console.log('Socket connected');
      } else {
        console.log('Socket disconnected');
      }
    });

    // Cleanup
    return () => {
      unsubscribeMessage();
      unsubscribeConnection();
      if (chat) {
        socketService.leaveChat(chat._id);
      }
    };
  }, [user, handleNewMessage]);

  // Clear processed message IDs when chat changes
  useEffect(() => {
    if (chat) {
      // Initialize processed IDs with existing messages
      processedMessageIds.current.clear();
      chat.messages.forEach(msg => {
        const messageId = msg._id || `${msg.content}_${msg.sender.name}_${msg.createdAt}`;
        processedMessageIds.current.add(messageId);
      });
      console.log('Initialized processed message IDs for chat:', chat._id);
    }
  }, [chat?._id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  const loadExistingChats = async () => {
    if (!user) return;
    
    try {
      const response = await api.get('/chat/customer');
      if (response.data.success && response.data.data.chats.length > 0) {
        // Find the most recent active chat (waiting or active status)
        const activeChat = response.data.data.chats.find((chat: any) => 
          chat.status === 'waiting' || chat.status === 'active'
        );
        
        if (activeChat) {
          // Use the active chat
          setChat(activeChat);
          socketService.joinChat(activeChat._id);
        } else {
          // No active chats, create a new one
          createNewChat();
        }
      } else {
        // No existing chats, create a new one automatically
        createNewChat();
      }
    } catch (error) {
      console.error('Error loading existing chats:', error);
      // If loading fails, create a new chat
      createNewChat();
    }
  };

  const createNewChat = async () => {
    if (!user) {
      toast.error('Please log in to start a chat');
      return;
    }

    try {
      const response = await api.post('/chat', {
        customer: {
          name: user.name,
          email: user.email,
          sessionId: `session_${Date.now()}`
        },
        subject: 'Customer Support',
        category: 'general',
        initialMessage: `Customer ${user.name} started a chat for support`
      });

      const newChat = response.data.data.chat;
      setChat(newChat);
      
      // Join chat room for real-time updates
      socketService.joinChat(newChat._id);
      
      toast.success('Chat started successfully!');
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to start chat. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chat) return;

    setSendingMessage(true);
    try {
      const response = await api.post(`/chat/${chat._id}/customer-messages`, {
        content: newMessage,
        messageType: 'text'
      });

      const message = response.data.data.message;
      
      // Don't update local state here - let Socket.io handle it
      // This prevents duplicate messages from API response + Socket.io event
      
      setNewMessage('');
      toast.success('Message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please check your connection and try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '--:--';
    }
  };

  if (!chat) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <MessageCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Live Chat Support</h2>
          <p className="text-gray-600 mb-6">Loading your chat...</p>
          {!isConnected && (
            <div className="text-yellow-600 text-sm">
              Connecting to chat server...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        {/* Chat Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-white">Chat: {chat.subject}</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm bg-white bg-opacity-20 px-2 py-1 rounded">
                {chat.status}
              </span>
              {!isConnected && (
                <span className="text-xs text-yellow-200 bg-yellow-600 bg-opacity-20 px-2 py-1 rounded">
                  Connecting...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div 
          className="h-96 overflow-y-auto p-4 bg-gray-50"
          role="log"
          aria-label="Chat messages"
        >
          {chat.messages.map((message, index) => (
            <div key={message._id || index} className={`mb-3 ${isCurrentUserMessage(message.sender.name) ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block max-w-xs px-3 py-2 rounded-lg ${
                isCurrentUserMessage(message.sender.name)
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-900 border'
              }`}>
                <div className="text-sm">{message.content}</div>
                <div className="text-xs mt-1 opacity-70">
                  {formatTime(message.createdAt)}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded"
              disabled={sendingMessage || !isConnected}
              aria-label="Type your message"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sendingMessage || !isConnected}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              aria-label="Send message"
            >
              {sendingMessage ? 'Sending...' : <Send className="w-4 h-4" />}
            </button>
          </div>
          {!isConnected && (
            <div className="text-red-600 text-sm mt-2">
              Connection lost. Trying to reconnect...
            </div>
          )}
        </div>
      </div>

      {/* Start New Chat Button */}
      <div className="mt-4 text-center">
        <button
          onClick={createNewChat}
          className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-50"
          disabled={!isConnected}
          aria-label="Start a new chat"
        >
          Start New Chat
        </button>
      </div>
    </div>
  );
}
