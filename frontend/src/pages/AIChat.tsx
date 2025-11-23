import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Upload } from 'lucide-react';
import { FileUpload } from '../components/ai-chat/FileUpload';
import { Chat } from '../components/ai-chat/Chat';
import { SessionList } from '../components/ai-chat/SessionList';

export function AIChat() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(true);

  const handleSessionCreated = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setShowUpload(false);
  };

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setShowUpload(false);
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setShowUpload(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center">
            <MessageSquare className="w-8 h-8 mr-3 text-primary" />
            Чат з ІІ
          </h1>
          <p className="text-gray-400 mt-2">
            Завантажте звіт та задайте питання про ваші дані
          </p>
        </div>
        {activeSessionId && (
          <button
            onClick={handleNewChat}
            className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Новий чат
          </button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sessions Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <SessionList
            activeSessionId={activeSessionId}
            onSessionSelect={handleSessionSelect}
            onNewChat={handleNewChat}
          />
        </motion.div>

        {/* Main Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          {showUpload || !activeSessionId ? (
            <FileUpload onSessionCreated={handleSessionCreated} />
          ) : (
            <Chat sessionId={activeSessionId} />
          )}
        </motion.div>
      </div>
    </div>
  );
}

