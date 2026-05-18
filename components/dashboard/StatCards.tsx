import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  FileStack,
} from "lucide-react";

interface StatCardsProps {
  activeCases: number;
  weekDeadlines: number;
  grantedThisMonth: number;
  pendingDocuments: number;
}

interface CardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

function StatCard({ label, value, icon: Icon, iconColor, iconBg }: CardProps) {
  return (
    <div className="flex items-center justify-between bg-white border border-slate-200 p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1.5 text-3xl font-semibold text-slate-900 tabular-nums">
          {value}
        </p>
      </div>
      <div className={`flex h-11 w-11 items-center justify-center ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
    </div>
  );
}

export function StatCards({
  activeCases,
  weekDeadlines,
  grantedThisMonth,
  pendingDocuments,
}: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatCard
        label="Active Cases"
        value={activeCases}
        icon={Briefcase}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
      />
      <StatCard
        label="Deadlines This Week"
        value={weekDeadlines}
        icon={CalendarClock}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
      />
      <StatCard
        label="Granted This Month"
        value={grantedThisMonth}
        icon={CheckCircle2}
        iconBg="bg-green-50"
        iconColor="text-green-600"
      />
      <StatCard
        label="Pending Documents"
        value={pendingDocuments}
        icon={FileStack}
        iconBg="bg-slate-100"
        iconColor="text-slate-600"
      />
    </div>
  );
}
