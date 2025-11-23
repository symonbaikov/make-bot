import { toast } from 'react-toastify';
import { GlassCard } from '../components/ui/GlassCard';
import { Button3D } from '../components/ui/Button3D';
import { Starfall } from '../components/ui/Starfall';
import { motion } from 'framer-motion';
import { Copy, ExternalLink, Info } from 'lucide-react';

// Payment plans with PayPal links
const paymentPlans = [
  {
    title: 'Базовий тариф',
    planType: 'BASIC',
    link: 'https://www.paypal.com/ncp/payment/WESJZGYJT5UW2',
    description: 'Стартовий план для початківців',
    gradient: 'from-blue-500 to-blue-600',
    shadowColor: 'shadow-blue-500/20',
  },
  {
    title: 'Стандартний тариф',
    planType: 'STANDARD',
    link: 'https://www.paypal.com/ncp/payment/3PVX5K9C34EBC',
    description: 'Оптимальний вибір для більшості користувачів',
    gradient: 'from-purple-500 to-purple-600',
    shadowColor: 'shadow-purple-500/20',
  },
  {
    title: 'Преміум тариф',
    planType: 'PREMIUM',
    link: 'https://www.paypal.com/ncp/payment/3SBYVU2HU7JBW',
    description: 'Максимальні можливості та переваги',
    gradient: 'from-amber-500 to-amber-600',
    shadowColor: 'shadow-amber-500/20',
  },
];

export function CreateSession() {
  const copyToClipboard = (link: string, planTitle: string) => {
    navigator.clipboard.writeText(link);
    toast.success(`Посилання для "${planTitle}" скопійовано!`);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <Starfall />
      
      <div className="relative z-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-white">Тарифні плани</h1>
          <p className="mt-2 text-gray-400">
            Оберіть підходящий тарифний план та скопіюйте посилання для оплати
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paymentPlans.map((plan, index) => (
            <motion.div
              key={plan.planType}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="h-full flex flex-col overflow-hidden group hover:border-primary/50 transition-colors">
                {/* Header with gradient */}
                <div className={`bg-gradient-to-r ${plan.gradient} p-6 text-white relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                  <h2 className="text-2xl font-bold mb-2 relative z-10">{plan.title}</h2>
                  <p className="text-white/90 text-sm relative z-10">{plan.description}</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 flex-1 flex flex-col">
                  {/* Link display */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-400">
                      Посилання для оплати:
                    </label>
                    <div className="relative group/input">
                      <input
                        type="text"
                        value={plan.link}
                        readOnly
                        className="w-full px-4 py-3 pr-10 bg-black/20 border border-glass-border rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all truncate"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Copy className="h-4 w-4 text-gray-500 group-hover/input:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto space-y-3">
                    {/* Copy button */}
                    <Button3D
                      onClick={() => copyToClipboard(plan.link, plan.title)}
                      className={`w-full bg-gradient-to-r ${plan.gradient} border-none`}
                    >
                      <span className="flex items-center justify-center">
                        <Copy className="h-4 w-4 mr-2" />
                        Копіювати посилання
                      </span>
                    </Button3D>

                    {/* Open in new tab button */}
                    <a
                      href={plan.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full"
                    >
                      <Button3D variant="secondary" className="w-full bg-white/5 hover:bg-white/10 border border-white/10">
                        <span className="flex items-center justify-center text-gray-300">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Відкрити в новій вкладці
                        </span>
                      </Button3D>
                    </a>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Info section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Info className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Як здійснити оплату?</h3>
                <ul className="text-gray-400 text-sm space-y-2">
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                    Оберіть підходящий тарифний план
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                    Скопіюйте посилання або відкрийте його в новій вкладці
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                    Завершіть оплату через PayPal
                  </li>
                  <li className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                    Після оплати доступ буде надано автоматично
                  </li>
                </ul>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
