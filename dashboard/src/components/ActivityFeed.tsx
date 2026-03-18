'use client';

interface ActivityEvent {
  time: string;
  type: 'locked' | 'claimed' | 'settled' | 'yield';
  description: string;
}

const events: ActivityEvent[] = [
  {
    time: '2 min ago',
    type: 'locked',
    description: 'INV-1089 locked — Highland Precision Engineering, £45,000',
  },
  {
    time: '18 min ago',
    type: 'yield',
    description: 'Yield accrued — £127.40 across 5 active invoices',
  },
  {
    time: '1 hr ago',
    type: 'claimed',
    description: 'INV-1084 claimed early — Leith Digital Services, £28,500',
  },
  {
    time: '3 hrs ago',
    type: 'settled',
    description: 'INV-1076 settled at maturity — Forth Bridge Fabrication, £185,000',
  },
  {
    time: '5 hrs ago',
    type: 'locked',
    description: 'INV-1088 locked — Cairngorm Analytics Ltd, £62,000',
  },
];

const typeStyles: Record<ActivityEvent['type'], { dot: string; label: string }> = {
  locked: { dot: 'bg-blue-500', label: 'Locked' },
  claimed: { dot: 'bg-emerald-500', label: 'Claimed' },
  settled: { dot: 'bg-purple-500', label: 'Settled' },
  yield: { dot: 'bg-amber-500', label: 'Yield' },
};

export default function ActivityFeed() {
  return (
    <div className="space-y-4">
      {events.map((event, i) => {
        const style = typeStyles[event.type];
        return (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-1.5">
              <span className={`block w-2 h-2 rounded-full ${style.dot}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 leading-snug">
                {event.description}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">{event.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
