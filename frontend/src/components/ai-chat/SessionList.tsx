import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Trash2, PlusCircle, FileText } from 'lucide-react';
import axios from 'axios';
import { format as formatDate } from 'date-fns';
import { uk } from 'date-fns/locale';

interface Session {
  id: string;
  fileName: string;
  fileType: string;
  messageCount: number;
  createdAt: string;
  summary: {
    totalRecords: number;
  };
}

interface SessionListProps {
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
}

export function SessionList({ activeSessionId, onSessionSelect, onNewChat }: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/admin/ai-chat/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setSessions(response.data.data.sessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Видалити цю сесію чату?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(`/api/admin/ai-chat/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Помилка при видаленні сесії');
    }
  };

  if (loading) {
    return (
      <div className="bg-glass backdrop-blur-xl rounded-2xl border border-glass-border p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-white/5 rounded-xl"></div>
          <div className="h-16 bg-white/5 rounded-xl"></div>
          <div className="h-16 bg-white/5 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-glass backdrop-blur-xl rounded-2xl border border-glass-border overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-glass-border bg-white/5">
        <h3 className="text-sm font-semibold text-white flex items-center">
          <MessageSquare className="w-4 h-4 mr-2 text-primary" />
          Історія чатів
        </h3>
      </div>

      {/* New Chat Button */}
      <div className="p-3 border-b border-glass-border">
        <button
          onClick={onNewChat}
          className="w-full px-4 py-3 bg-gradient-to-r from-primary to-secondary rounded-xl text-white font-medium text-sm flex items-center justify-center hover:shadow-lg hover:shadow-primary/50 transition-all"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Новий чат
        </button>
      </div>

      {/* Sessions List */}
      <div className="p-2 space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Немає активних чатів</p>
            <p className="text-xs text-gray-500 mt-1">
              Завантажте файл, щоб почати
            </p>
          </div>
        ) : (
          sessions.map((session) => (
            <motion.button
              key={session.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => onSessionSelect(session.id)}
              className={`
                w-full p-3 rounded-xl text-left transition-all group relative
                ${
                  activeSessionId === session.id
                    ? 'bg-primary/20 border-2 border-primary'
                    : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-medium text-white truncate mb-1">
                    {session.fileName}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <span>{session.messageCount} повідомлень</span>
                    <span>•</span>
                    <span>{session.summary.totalRecords} записів</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(new Date(session.createdAt), 'dd MMM, HH:mm', { locale: uk })}
                  </p>
                </div>

                <button
                  onClick={(e) => handleDelete(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}

