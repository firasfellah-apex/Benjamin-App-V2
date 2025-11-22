import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OrderWithDetails } from '@/types/types';
import { createOrderIssue, type OrderIssueCategory } from '@/db/api';
import { toast } from 'sonner';

interface ReportIssueSheetProps {
  open: boolean;
  order: OrderWithDetails;
  onClose: () => void;
}

const ISSUE_OPTIONS: { id: OrderIssueCategory; label: string }[] = [
  { id: 'CASH_AMOUNT',      label: 'Cash amount was wrong' },
  { id: 'LATE_ARRIVAL',     label: 'Runner arrived very late' },
  { id: 'SAFETY_CONCERN',   label: 'Felt unsafe or uncomfortable' },
  { id: 'UNPROFESSIONAL',   label: 'Runner was unprofessional' },
  { id: 'OTHER',            label: 'Something else' },
];

export function ReportIssueSheet({ open, order, onClose }: ReportIssueSheetProps) {
  const [selectedCategories, setSelectedCategories] = useState<OrderIssueCategory[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const toggleCategory = (id: OrderIssueCategory) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) {
      toast.error('Tell us what went wrong so we can look into it.');
      return;
    }

    const primaryCategory = selectedCategories[0];

    // Append all selected categories into the notes so support sees the full picture
    const categoriesLabel = selectedCategories
      .map(id => {
        const opt = ISSUE_OPTIONS.find(o => o.id === id);
        return opt?.label || id;
      })
      .join(', ');

    const combinedNotes = `${
      notes.trim() || ''
    }${notes.trim() ? '\n\n' : ''}Selected reasons: ${categoriesLabel}`;

    try {
      setSubmitting(true);

      await createOrderIssue({
        orderId: order.id,
        customerId: order.customer_id,
        runnerId: order.runner_id ?? null,
        category: primaryCategory,
        notes: combinedNotes,
      });

      toast.success("Thanks for flagging this. We're sorry something felt off — our team will review it.");
      onClose();
      // Reset form
      setSelectedCategories([]);
      setNotes('');
    } catch (err: any) {
      console.error('[ReportIssueSheet] submit error', err);
      toast.error(err?.message || 'Could not send your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* light local backdrop (so it feels nested in the rating modal) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/40"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-[120] bg-white rounded-t-3xl shadow-2xl max-h-[70vh] overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 pt-4 pb-2 relative">
              <div className="h-1 w-10 bg-slate-200 rounded-full mx-auto" />

              <div className="absolute top-4 right-4 z-10">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-12 h-12 p-0 inline-flex items-center justify-center rounded-full border border-[#F0F0F0] bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-slate-900" />
                </button>
              </div>
            </div>

            <div className="px-6 pt-6 pb-6 space-y-5 overflow-y-auto">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  We're sorry something felt off
                </h2>
                <p className="text-sm text-slate-500">
                  This doesn't affect your runner right away. It simply flags this delivery for the Benjamin team to review.
                </p>
              </div>

              {/* Issue chips */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  What felt off? <span className="text-slate-400 text-xs">(you can pick more than one)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {ISSUE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleCategory(option.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border transition-colors',
                        selectedCategories.includes(option.id)
                          ? 'border-black bg-black text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  Anything else we should know? <span className="text-slate-400">(optional)</span>
                </p>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 placeholder:font-light focus:border-[#22C55E] focus-visible:border-[#22C55E] focus:bg-green-50 focus-visible:ring-0 focus:placeholder:opacity-0 focus-visible:outline-none"
                  placeholder="Short and honest is perfect. Tell us what didn't feel right."
                />
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <Button
                  type="button"
                  disabled={submitting || selectedCategories.length === 0}
                  onClick={handleSubmit}
                  className="w-full h-[56px] rounded-full bg-black text-white hover:bg-black/90 text-base font-medium"
                >
                  {submitting ? 'Sending...' : 'Send to Benjamin'}
                </Button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onClose}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 py-1.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
