import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import CreatePublicationModal from '../components/publications/CreatePublicationModal';
import PublicationsList from '../components/publications/PublicationsList';
import PublicationFilters from '../components/publications/PublicationFilters';
import { PublicationListParams } from '../types/publication';
import { Button3D } from '../components/ui/Button3D';

export default function Publications() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState<PublicationListParams>({
    page: 1,
    limit: 20,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFilterChange = (newFilters: PublicationListParams) => {
    setFilters({ ...newFilters, page: 1 }); // Reset to first page on filter change
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handlePublicationCreated = () => {
    setShowCreateModal(false);
    setRefreshKey(prev => prev + 1); // Trigger refresh
  };

  const handlePublicationDeleted = () => {
    setRefreshKey(prev => prev + 1); // Trigger refresh
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Публикации</h1>
          <p className="mt-1 text-sm text-gray-400">
            Управление кросс-постингом в социальных сетях
          </p>
        </div>
        <Button3D
          onClick={() => setShowCreateModal(true)}
          className="flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Создать публикацию
        </Button3D>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <PublicationFilters filters={filters} onFilterChange={handleFilterChange} />
      </motion.div>

      {/* Publications List */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <PublicationsList
          key={refreshKey}
          filters={filters}
          onPageChange={handlePageChange}
          onPublicationDeleted={handlePublicationDeleted}
        />
      </motion.div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePublicationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handlePublicationCreated}
        />
      )}
    </div>
  );
}
