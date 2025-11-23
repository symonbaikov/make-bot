import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Platform } from '../../types/publication';

// Platform icons and colors
const platforms = [
  {
    id: 'instagram' as Platform,
    name: 'Instagram',
    icon: '📷',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
    borderColor: 'border-purple-300',
    selectedBorder: 'border-purple-500',
  },
  {
    id: 'tiktok' as Platform,
    name: 'TikTok',
    icon: '🎵',
    color: 'from-black to-gray-800',
    bgColor: 'bg-gradient-to-br from-gray-50 to-gray-100',
    borderColor: 'border-gray-300',
    selectedBorder: 'border-black',
  },
  {
    id: 'facebook' as Platform,
    name: 'Facebook',
    icon: '📘',
    color: 'from-blue-600 to-blue-700',
    bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
    borderColor: 'border-blue-300',
    selectedBorder: 'border-blue-600',
  },
  {
    id: 'youtube' as Platform,
    name: 'YouTube',
    icon: '▶️',
    color: 'from-red-600 to-red-700',
    bgColor: 'bg-gradient-to-br from-red-50 to-red-100',
    borderColor: 'border-red-300',
    selectedBorder: 'border-red-600',
  },
];

interface PlatformSelectorProps {
  selected: Platform[];
  onChange: (platforms: Platform[]) => void;
  error?: string;
}

export default function PlatformSelector({ selected, onChange, error }: PlatformSelectorProps) {
  const togglePlatform = (platformId: Platform) => {
    if (selected.includes(platformId)) {
      onChange(selected.filter(p => p !== platformId));
    } else {
      onChange([...selected, platformId]);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Социальные сети
          <span className="text-red-500 ml-1">*</span>
        </label>
        <p className="mt-1 text-sm text-gray-500">Выберите платформы для публикации (минимум 1)</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {platforms.map(platform => {
          const isSelected = selected.includes(platform.id);

          return (
            <motion.button
              key={platform.id}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => togglePlatform(platform.id)}
              className={`
                relative p-4 rounded-lg border-2 transition-all
                ${isSelected ? platform.bgColor : 'bg-white'}
                ${isSelected ? platform.selectedBorder : platform.borderColor}
                ${isSelected ? 'shadow-md' : 'hover:border-gray-400'}
              `}
            >
              <div className="flex items-center space-x-3">
                <div className={`text-3xl bg-gradient-to-br ${platform.color} bg-clip-text`}>
                  {platform.icon}
                </div>
                <span className="font-medium text-gray-900">{platform.name}</span>
              </div>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="absolute top-2 right-2"
                >
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-600"
        >
          {error}
        </motion.p>
      )}

      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 text-sm text-gray-600"
        >
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span>
            Выбрано {selected.length} {selected.length === 1 ? 'платформа' : 'платформы'}
          </span>
        </motion.div>
      )}
    </div>
  );
}

