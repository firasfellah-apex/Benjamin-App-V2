/**
 * DeliveryTimeline Component
 * 
 * Shows a vertical timeline of delivery events
 */

import React from "react";
import { Check, Clock } from "@/lib/icons";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  label: string;
  time?: string;
  icon: React.ReactNode;
  isDone: boolean;
}

interface DeliveryTimelineProps {
  events: TimelineEvent[];
}

export function DeliveryTimeline({ events }: DeliveryTimelineProps) {
  return (
    <ol className="mt-4 space-y-3">
      {events.map((event, index) => (
        <li key={event.id} className="flex gap-3">
          <div className="mt-1">
            <div
              className={cn(
                "h-6 w-6 rounded-full border flex items-center justify-center text-xs",
                event.isDone
                  ? "bg-green-50 border-green-400 text-green-600"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              )}
            >
              {event.isDone ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            </div>
            {index < events.length - 1 && (
              <div
                className={cn(
                  "w-0.5 h-6 ml-[11px] mt-1",
                  event.isDone ? "bg-green-200" : "bg-slate-200"
                )}
              />
            )}
          </div>
          <div className="flex-1 pb-3">
            <div className="text-xs font-medium text-slate-700">{event.label}</div>
            {event.time && (
              <div className="text-[11px] text-slate-400 mt-0.5">{event.time}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

