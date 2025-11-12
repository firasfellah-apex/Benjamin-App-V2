/**
 * CustomerLayout Component
 * 
 * Simple wrapper for customer pages with smooth page transitions.
 * No nested cards or frames - pages handle their own layout via CustomerScreen.
 */

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <div className="h-full flex flex-col bg-[#F4F5F7] overflow-hidden">
      {children}
    </div>
  );
}
