import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import PageTitle from '../components/Shared/PageTitle';
import ChatDashboard from '../components/Chat/ChatDashboard';
import { ChatProvider } from '../components/Chat/ChatProvider';
import { authService } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { MessageCircle, User, Clock } from '../utils/icons';
import socketService from '../services/socketService';

interface Customer {
  _id: string;
  name: string;
  email: string;
  lastActivity?: string;
  unreadCount?: number;
  lastMessageTime?: string;
}

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

export default function LiveChatPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Track processed message IDs to prevent duplicates
  const processedMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Check authentication on component mount
    if (!authService.isAuthenticated()) {
      toast.error('Please login to access chat management');
      navigate('/auth/login');
      return;
    }

    // Connect to socket
    socketService.connect();
    
    // Join user room
    const user = authService.getCurrentUserFromStorage();
    if (user) {
      socketService.joinUser(user.id);
      console.log('Joined user room:', user.id);
    }

    // Load customers list
    loadCustomers();

         // Set up socket listeners
     const unsubscribeMessage = socketService.onMessage(handleNewMessage);

    const unsubscribeConnection = socketService.onConnection((connected: boolean) => {
      if (connected) {
        console.log('Socket connected successfully');
        toast.success('Real-time chat connected!');
      } else {
        console.log('Socket disconnected');
        toast.error('Real-time chat disconnected');
      }
    });

    // Listen for chat message read events to update unread counts
    const unsubscribeMessageRead = socketService.onMessageRead((data: any) => {
      console.log('🔔 Socket: Messages marked as read for chat:', data.chatId);
      // Reorder customers list when messages are marked as read
      reorderCustomersOnRead(data.chatId);
    });

    // Cleanup
    return () => {
      unsubscribeMessage();
      unsubscribeConnection();
      unsubscribeMessageRead();
      if (selectedChat) {
        socketService.leaveChat(selectedChat._id);
      }
    };
  }, [navigate, selectedChat?._id]);

  // Clear processed message IDs when chat changes
  useEffect(() => {
    if (selectedChat) {
      // Initialize processed IDs with existing messages
      processedMessageIds.current.clear();
      selectedChat.messages.forEach(msg => {
        const messageId = msg._id || `${msg.content}_${msg.sender.name}_${msg.createdAt}`;
        processedMessageIds.current.add(messageId);
      });
      console.log('Initialized processed message IDs for chat:', selectedChat._id);
    }
  }, [selectedChat?._id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat?.messages]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/chat');
      if (response.data.success) {
        // Extract unique customers from chats
        const customerMap = new Map();
        response.data.data.chats.forEach((chat: any) => {
          const customerId = chat.customer._id || chat.customer.email;
          
          // Calculate unread count for this chat using debug function
          const unreadCount = debugUnreadCount(chat);
          
          if (!customerMap.has(customerId)) {
            customerMap.set(customerId, {
              _id: customerId,
              name: chat.customer.name,
              email: chat.customer.email,
              lastActivity: chat.lastActivity || chat.createdAt,
              unreadCount: unreadCount
            });
          } else {
            // Update unread count and last activity
            const existing = customerMap.get(customerId);
            existing.unreadCount = unreadCount; // Use current unread count, don't add
            if (chat.lastActivity > existing.lastActivity) {
              existing.lastActivity = chat.lastActivity;
            }
          }
        });
        
        const customersList = Array.from(customerMap.values())
          .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
        
        console.log('Updated customers list with unread counts:', customersList);
        setCustomers(customersList);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerChat = async (customer: Customer) => {
    try {
      setSelectedCustomer(customer);
      
      // Leave previous chat room
      if (selectedChat) {
        socketService.leaveChat(selectedChat._id);
      }
      
      const response = await api.get(`/chat?customer=${customer.email}`);
      if (response.data.success && response.data.data.chats.length > 0) {
        // Get the most recent chat for this customer
        const chat = response.data.data.chats[0];
        setSelectedChat(chat);
        
        // Join new chat room
        socketService.joinChat(chat._id);
        
        // Auto-mark customer messages as read when viewing the chat
        await markChatAsRead(chat._id);
      } else {
        setSelectedChat(null);
      }
    } catch (error) {
      console.error('Error loading customer chat:', error);
      toast.error('Failed to load chat');
    }
  };

  const markChatAsRead = async (chatId: string) => {
    try {
      console.log('Marking chat as read:', chatId);
      const response = await api.put(`/chat/${chatId}/mark-read`);
      if (response.data.success) {
        console.log('Chat marked as read successfully');
        // Refresh customers list to update unread counts
        loadCustomers();
      }
    } catch (error) {
      console.error('Error marking chat as read:', error);
      // Don't show error toast for this - it's not critical
    }
  };

  // Function to manually refresh unread counts
  const refreshUnreadCounts = async () => {
    try {
      console.log('🔄 Manually refreshing unread counts...');
      await loadCustomers();
      toast.success('Unread counts refreshed');
    } catch (error) {
      console.error('Error refreshing unread counts:', error);
      toast.error('Failed to refresh unread counts');
    }
  };

  // Debug function to check unread count calculation
  const debugUnreadCount = (chat: any) => {
    console.log('🔍 Debug: Chat messages for unread count calculation:', {
      chatId: chat._id,
      customerName: chat.customer.name,
      totalMessages: chat.messages?.length || 0,
      messages: chat.messages?.map((m: any) => ({
        content: m.content,
        sender: m.sender,
        isRead: m.isRead,
        createdAt: m.createdAt
      }))
    });
    
    const unreadCount = chat.messages?.filter((m: any) => {
      const isFromCustomer = m.sender?.name === 'Customer' || 
                           m.sender?.name === chat.customer.name ||
                           m.sender?.email === chat.customer.email;
      const isUnread = !m.isRead;
      console.log(`🔍 Message: "${m.content}" - From Customer: ${isFromCustomer}, Unread: ${isUnread}`);
      return isUnread && isFromCustomer;
    }).length || 0;
    
    console.log(`🔍 Calculated unread count: ${unreadCount}`);
    return unreadCount;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    setSendingMessage(true);
    try {
      console.log('Sending message via API:', newMessage);
      
      const response = await api.post(`/chat/${selectedChat._id}/messages`, {
        content: newMessage,
        messageType: 'text'
      });

      const message = response.data.data.message;
      console.log('API response message:', message);
      
      // Don't update local state here - let Socket.io handle it
      // This prevents duplicate messages from API response + Socket.io event
      
      setNewMessage('');
      toast.success('Message sent!');
      
      // Refresh customers list to update unread counts
      loadCustomers();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Function to reorder customers when new messages arrive
  const reorderCustomersOnNewMessage = (chatId: string, newMessage: any) => {
    setCustomers(prevCustomers => {
      // Find the customer for this chat by matching email or name
      const customerIndex = prevCustomers.findIndex(customer => 
        customer.email === newMessage.sender.email || 
        customer.name === newMessage.sender.name
      );

      if (customerIndex === -1) {
        // Customer not found, return current list
        return prevCustomers;
      }

      // Create a copy of the customers array
      const updatedCustomers = [...prevCustomers];
      const customer = { ...updatedCustomers[customerIndex] };
      
      // Update customer's unread count and last message time
      customer.unreadCount = (customer.unreadCount || 0) + 1;
      customer.lastMessageTime = newMessage.createdAt;
      customer.lastActivity = newMessage.createdAt;

      // Remove customer from current position
      updatedCustomers.splice(customerIndex, 1);

      // Find new position based on updated unread count and last message time
      let newIndex = 0;
      for (let i = 0; i < updatedCustomers.length; i++) {
        const otherCustomer = updatedCustomers[i];
        const otherUnreadCount = otherCustomer.unreadCount || 0;
        
        // If this customer has unread messages and the other doesn't, insert before
        if (customer.unreadCount > 0 && otherUnreadCount === 0) {
          newIndex = i;
          break;
        }
        
        // If both have unread messages, compare by last message time
        if (customer.unreadCount > 0 && otherUnreadCount > 0) {
          const customerTime = customer.lastMessageTime || customer.lastActivity || '';
          const otherTime = otherCustomer.lastMessageTime || otherCustomer.lastActivity || '';
          if (new Date(customerTime) > new Date(otherTime)) {
            newIndex = i;
            break;
          }
        }
        
        // If neither has unread messages, compare by last activity
        if (customer.unreadCount === 0 && otherUnreadCount === 0) {
          const customerTime = customer.lastActivity || '';
          const otherTime = otherCustomer.lastActivity || '';
          if (new Date(customerTime) > new Date(otherTime)) {
            newIndex = i;
            break;
          }
        }
        
        newIndex = i + 1;
      }

      // Insert customer at new position
      updatedCustomers.splice(newIndex, 0, customer);

      console.log('🔄 Reordered customers list after new message:', {
        customerName: customer.name,
        newPosition: newIndex,
        unreadCount: customer.unreadCount,
        lastMessageTime: customer.lastMessageTime
      });

      return updatedCustomers;
    });
  };

  // Function to reorder customers when messages are marked as read
  const reorderCustomersOnRead = (chatId: string) => {
    setCustomers(prevCustomers => {
      // Find the customer for this chat by checking if they have a chat with this ID
      // This is a simplified approach - we'll need to find the customer differently
      // For now, we'll refresh the entire list to ensure accuracy
      loadCustomers();
      return prevCustomers;
    });
  };

  // Enhanced message handler with real-time reordering
  const handleNewMessage = (data: any) => {
    console.log('🔔 Socket: Received new message:', {
      chatId: data.chatId,
      messageContent: data.message.content,
      sender: data.message.sender.name,
      messageId: data.message._id,
      selectedChatId: selectedChat?._id,
      hasSelectedChat: !!selectedChat
    });
    
    // Always try to reorder customers list in real-time when new message arrives
    // This ensures unread counts update even when no customer is selected
    reorderCustomersOnNewMessage(data.chatId, data.message);
    
    // Only update selected chat if this message is for the currently selected chat
    if (data.chatId === selectedChat?._id) {
      // Enhanced duplicate prevention with better logging
      // Use MongoDB-generated _id if available, otherwise use content-based fingerprint
      const messageId = data.message._id || `${data.message.content}_${data.message.sender.name}_${data.message.createdAt}`;
      
      if (processedMessageIds.current.has(messageId)) {
        console.log('🚫 Socket: Message already processed, skipping duplicate:', messageId);
        return;
      }
      
      // Mark message as processed
      processedMessageIds.current.add(messageId);
      console.log('✅ Socket: Message marked as processed:', messageId);
       
      // Add new message to current chat
      setSelectedChat(prev => {
        if (!prev) return null;
        
        // Additional safety check - ensure message doesn't already exist
        const messageExists = prev.messages.some(msg => {
          if (msg._id && data.message._id && msg._id === data.message._id) {
            console.log('🚫 Socket: Message with same ID already exists:', msg._id);
            return true;
          }
          if (msg.content === data.message.content && 
              msg.sender.name === data.message.sender.name &&
              Math.abs(new Date(msg.createdAt).getTime() - new Date(data.message.createdAt).getTime()) < 1000) {
            console.log('🚫 Socket: Message with same content/sender/timestamp already exists');
            return true;
          }
          return false;
        });
        
        if (messageExists) {
          console.log('🚫 Socket: Message already exists in chat, skipping duplicate');
          return prev;
        }
        
        console.log('✅ Socket: Adding new message to chat:', data.message.content);
        return {
          ...prev,
          messages: [...prev.messages, data.message]
        };
      });
    } else {
      // Message is for a different chat - ensure unread counts are updated
      console.log('📝 Message for different chat, ensuring unread counts are updated');
      
      // If the reordering didn't work, fallback to refreshing the list
      setTimeout(() => {
        const customerWithUnread = customers.find(c => 
          c.email === data.message.sender.email || 
          c.name === data.message.sender.name
        );
        
        if (!customerWithUnread || (customerWithUnread.unreadCount || 0) === 0) {
          console.log('🔄 Fallback: Refreshing customers list to update unread counts');
          loadCustomers();
        }
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <PageTitle title="Live Chat Management" />
        <p className="text-gray-600">Manage and monitor live chat conversations with customers</p>
        
        {/* Debug Panel - remove in production */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-yellow-800">
              <strong>Debug Info:</strong> Total customers: {customers.length} | 
              Customers with unread: {customers.filter(c => (c.unreadCount || 0) > 0).length}
            </div>
            <button
              onClick={() => {
                console.log('Current customers state:', customers);
                console.log('Selected customer:', selectedCustomer);
                console.log('Selected chat:', selectedChat);
              }}
              className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Log State
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Left Side - Customers List */}
        <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Customers</h3>
                <p className="text-sm text-gray-600">{customers.length} active customers</p>
              </div>
              <button
                onClick={refreshUnreadCounts}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                title="Refresh unread counts"
              >
                🔄
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto h-[calc(100%-80px)]">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading customers...</div>
            ) : customers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No customers found</div>
            ) : (
              customers.map((customer) => (
                <div
                  key={customer._id}
                  onClick={() => loadCustomerChat(customer)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedCustomer?._id === customer._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{customer.name}</span>
                    </div>
                                         {(customer.unreadCount || 0) > 0 && (
                       <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                         {customer.unreadCount || 0}
                       </span>
                     )}
                     {/* Debug info - remove in production */}
                     <span className="text-xs text-gray-400 ml-1">
                       ID: {customer._id.slice(-4)}
                     </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{customer.email}</p>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{customer.lastActivity ? formatDate(customer.lastActivity) : 'No activity'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side - Chat Interface */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200">
          {!selectedCustomer ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Customer</h3>
                <p className="text-gray-600">Choose a customer from the list to view their chat history</p>
              </div>
            </div>
          ) : !selectedChat ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Chat History</h3>
                <p className="text-gray-600">This customer hasn't started any chats yet</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Chat Header */}
              <div className="bg-blue-600 text-white p-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-white m">{selectedCustomer.name}</h3>
                    <p className="text-sm text-blue-100">{selectedCustomer.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm bg-white bg-opacity-20 px-2 py-1 rounded">
                      {selectedChat.status}
                    </span>
                    <p className="text-xs text-blue-100 mt-1">
                      Started {formatDate(selectedChat.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {selectedChat.messages.map((message, index) => (
                  <div key={message._id || index} className={`mb-3 ${message.sender?.name === 'Customer' ? 'text-left' : 'text-right'}`}>
                    <div className={`inline-block max-w-xs px-3 py-2 rounded-lg ${
                      message.sender?.name === 'Customer' 
                        ? 'bg-white text-gray-900 border' 
                        : 'bg-blue-600 text-white'
                    }`}>
                      <div className="text-sm">{message.content}</div>
                      <div className={`text-xs mt-1 ${
                        message.sender?.name === 'Customer' ? 'text-gray-500' : 'text-blue-100'
                      }`}>
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200">
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
                    disabled={sendingMessage}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sendingMessage ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
