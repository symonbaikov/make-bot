import { Clock, Loader, CheckCircle, AlertCircle, XCircle, Ban } from 'lucide-react';
import { PublicationStatus } from '../../types/publication';

const statusConfig = {
  PENDING: {
    color: 'bg-gray-100 text-gray-700',
    icon: Clock,
    label: 'В ожидании',
  },
  PROCESSING: {
    color: 'bg-blue-100 text-blue-700',
    icon: Loader,
    label: 'В обработке',
    animate: true,
  },
  PUBLISHED: {
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
    label: 'Опубликовано',
  },
  PARTIAL: {
    color: 'bg-orange-100 text-orange-700',
    icon: AlertCircle,
    label: 'Частично',
  },
  FAILED: {
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
    label: 'Ошибка',
  },
  CANCELLED: {
    color: 'bg-gray-100 text-gray-600',
    icon: Ban,
    label: 'Отменено',
  },
};

interface StatusBadgeProps {
  status: PublicationStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  return (
    <span
      className={`
        inline-flex items-center space-x-1.5 rounded-full font-medium
        ${config.color}
        ${sizeClasses[size]}
      `}
    >
      <Icon
        className={`${iconSizes[size]} ${'animate' in config && config.animate ? 'animate-spin' : ''}`}
      />
      <span>{config.label}</span>
    </span>
  );
}
