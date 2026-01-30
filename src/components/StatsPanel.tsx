import { Users, Eye, Shield, Clock } from 'lucide-react';
import { RegisteredPerson } from '@/types/face';

interface StatsPanelProps {
  people: RegisteredPerson[];
  isActive: boolean;
  totalDetections: number;
}

export const StatsPanel = ({ people, isActive, totalDetections }: StatsPanelProps) => {
  const stats = [
    {
      label: 'Personas',
      value: people.length,
      icon: Users,
      color: 'text-primary',
    },
    {
      label: 'Detecciones',
      value: totalDetections,
      icon: Eye,
      color: 'text-accent',
    },
    {
      label: 'Estado',
      value: isActive ? 'Activo' : 'Inactivo',
      icon: Shield,
      color: isActive ? 'text-success' : 'text-muted-foreground',
    },
    {
      label: 'Última Sesión',
      value: 'Hoy',
      icon: Clock,
      color: 'text-warning',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-4 bg-card border border-border/50 rounded-lg hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
            <div>
              <p className="text-2xl font-display text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
