import { CATEGORIES } from '../../utils/categories';

export default function CategoryBadge({ category }) {
  const config = CATEGORIES[category];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${config.badge}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
