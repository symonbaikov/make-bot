import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, FileText } from 'lucide-react';
import { Message } from './Message';
import axios from 'axios';

interface ChatProps {
  sessionId: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface SessionInfo {
  id: string;
  fileName: string;
  fileType: string;
  summary: {
    totalRecords: number;
    metrics?: {
      totalRevenue?: number;
      totalSessions?: number;
    };
  };
}

export function Chat({ sessionId }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadSession();
    loadMessages();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSession = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`/api/admin/ai-chat/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setSessionInfo(response.data.data);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(`/api/admin/ai-chat/sessions/${sessionId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setMessages(response.data.data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message immediately
    const tempUserMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        `/api/admin/ai-chat/sessions/${sessionId}/messages`,
        { message: userMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Replace temp message with real one and add AI response
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMessage.id);
          return [
            ...filtered,
            {
              ...tempUserMessage,
              id: 'user-' + Date.now(),
            },
            response.data.data,
          ];
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: 'Вибачте, сталася помилка. Спробуйте ще раз.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    'Який середній чек?',
    'Який найпопулярніший план?',
    'Дай 3 ключові інсайти',
    'Покажи тренди',
    'Які рекомендації?',
  ];

  const handleSuggestedClick = (question: string) => {
    setInput(question);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-250px)] bg-glass backdrop-blur-xl rounded-2xl border border-glass-border shadow-xl">
      {/* Session Info Header */}
      {sessionInfo && (
        <div className="p-4 border-b border-glass-border bg-white/5">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-primary mr-2" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{sessionInfo.fileName}</p>
              <p className="text-xs text-gray-400">
                {sessionInfo.summary.totalRecords} записів
                {sessionInfo.summary.metrics?.totalRevenue && (
                  <span className="ml-2">
                    • ${sessionInfo.summary.metrics.totalRevenue.toFixed(2)} дохід
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence>
          {messages.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Почніть розмову</h3>
              <p className="text-gray-400 mb-6">Задайте питання про ваші дані</p>

              <div className="max-w-md mx-auto">
                <p className="text-sm text-gray-400 mb-3">Запропоновані питання:</p>
                <div className="space-y-2">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedClick(question)}
                      className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-left text-sm text-gray-300 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-2 text-gray-400"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">AI аналізує...</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-glass-border bg-white/5">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Задайте питання про ваші дані..."
            className="flex-1 px-4 py-3 bg-white/5 border border-glass-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors resize-none"
            rows={1}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-6 py-3 bg-gradient-to-r from-primary to-secondary rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/50 transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Натисніть Enter для відправки, Shift+Enter для нового рядка
        </p>
      </div>
    </div>
  );
}

