export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-surface-2 rounded-xl ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-4 flex items-center gap-4">
      <Skeleton className="w-11 h-11 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}
