import { ReactNode } from "react";

export function CustomerFooter({
  left,
  right,
  progress,
}: {
  left?: ReactNode;
  right?: ReactNode;
  progress?: ReactNode; // dots/steps if present
}) {
  return (
    <div className="space-y-3">
      {progress}
      <div className="flex items-center gap-3">
        {left && <div className="flex-1">{left}</div>}
        {right && <div className="flex-[1.4]">{right}</div>}
      </div>
    </div>
  );
}









