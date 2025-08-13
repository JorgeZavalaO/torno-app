"use client";
export function NotificationBubble({ count, title }: { count: number; title?: string }) {
  if (!count) return null;
  return (
    <span title={title} className="inline-flex items-center justify-center ml-2 rounded-full bg-red-600 text-white text-[10px] min-w-[18px] h-[18px] px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}
