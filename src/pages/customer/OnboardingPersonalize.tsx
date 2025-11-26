/**
 * Customer Personalization Onboarding Page
 * 
 * Collects user preferences:
 * - Usual withdrawal amount
 * - Preferred handoff style
 * - Cash usage categories
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { saveProfile } from '@/lib/profileMutations';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChipSelector } from '@/components/common/ChipSelector';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const WITHDRAWAL_AMOUNTS = [
  { value: '100', label: '$100' },
  { value: '200', label: '$200' },
  { value: '300', label: '$300' },
  { value: '500', label: '$500+' },
  { value: 'varies', label: 'It varies' },
];

const HANDOFF_STYLES = [
  { value: 'speed', label: 'Fast & discreet' },
  { value: 'counted', label: 'Careful count together' },
  { value: 'depends', label: 'Depends on the situation' },
];

const USAGE_CATEGORIES = [
  { value: 'valet_tipping', label: 'Valet & tipping' },
  { value: 'nightlife', label: 'Nightlife & outings' },
  { value: 'home_services', label: 'Home services' },
  { value: 'splitting_bills', label: 'Splitting bills' },
  { value: 'personal_purchases', label: 'Personal purchases' },
  { value: 'other', label: 'Other' },
];

export default function OnboardingPersonalize() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile } = useProfile(user?.id);
  
  const [usualAmount, setUsualAmount] = useState<string | null>(null);
  const [handoffStyle, setHandoffStyle] = useState<string | null>(null);
  const [usageCategories, setUsageCategories] = useState<string[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Redirect if personalization is already complete (all three fields are non-null)
  useEffect(() => {
    if (profile && 
        profile.usual_withdrawal_amount !== null && 
        profile.preferred_handoff_style !== null && 
        profile.cash_usage_categories !== null) {
      navigate('/customer/home', { replace: true });
    }
  }, [profile, navigate]);

  // Pre-fill from existing profile if available
  useEffect(() => {
    if (profile) {
      if (profile.usual_withdrawal_amount !== null) {
        const amountValue = profile.usual_withdrawal_amount === 500 ? '500' : String(profile.usual_withdrawal_amount);
        setUsualAmount(amountValue);
      }
      if (profile.preferred_handoff_style) {
        setHandoffStyle(profile.preferred_handoff_style);
      }
      if (profile.cash_usage_categories && Array.isArray(profile.cash_usage_categories)) {
        setUsageCategories(profile.cash_usage_categories);
      }
    }
  }, [profile]);

  const handleContinue = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to complete onboarding');
      return;
    }

    setIsSaving(true);

    try {
      const updates: any = {
        usual_withdrawal_amount: usualAmount && usualAmount !== 'varies' ? Number(usualAmount) : null,
        preferred_handoff_style: handoffStyle || null,
        cash_usage_categories: usageCategories && usageCategories.length > 0 ? usageCategories : null,
      };

      await saveProfile(user.id, updates);

      toast.success('Preferences saved!');
      navigate('/customer/home', { replace: true });
    } catch (error: any) {
      console.error('Error saving personalization:', error);
      toast.error(error?.message || 'Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    navigate('/customer/home', { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="min-h-dvh flex flex-col bg-white"
    >
      {/* Scrollable content */}
      <main className="flex-1 px-6 pt-10 pb-32 overflow-y-auto">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Let's personalize your experience
        </h1>
        <p className="mt-2 text-slate-500">
          Takes just a few seconds and helps tailor Benjamin to you.
        </p>

        <div className="mt-8 space-y-8">
          {/* Question 1: Usual withdrawal amount */}
          <section className="space-y-3">
            <div>
              <Label className="text-sm font-semibold text-gray-900">
                Your usual withdrawal amount
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Helps us preset your amount for faster ordering.
              </p>
            </div>
            <ChipSelector
              options={WITHDRAWAL_AMOUNTS}
              value={usualAmount}
              onChange={(value) => setUsualAmount(value as string | null)}
            />
          </section>

          {/* Question 2: Preferred handoff style */}
          <section className="space-y-3">
            <div>
              <Label className="text-sm font-semibold text-gray-900">
                Preferred handoff style
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                How do you usually like receiving cash?
              </p>
            </div>
            <ChipSelector
              options={HANDOFF_STYLES}
              value={handoffStyle}
              onChange={(value) => setHandoffStyle(value as string | null)}
            />
          </section>

          {/* Question 3: Cash usage categories */}
          <section className="space-y-3">
            <div>
              <Label className="text-sm font-semibold text-gray-900">
                What do you typically need cash for?
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Personalizing your experience helps us improve.
              </p>
            </div>
            <ChipSelector
              options={USAGE_CATEGORIES}
              value={usageCategories}
              onChange={(value) => setUsageCategories(value as string[] | null)}
              multiSelect
            />
          </section>
        </div>
      </main>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-4 safe-area-bottom">
        <div className="max-w-md mx-auto space-y-3">
          <Button
            onClick={handleContinue}
            disabled={isSaving}
            className="w-full h-[56px] rounded-full bg-black text-white hover:bg-black/90 text-base font-medium"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              'Continue'
            )}
          </Button>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-sm text-slate-500 hover:text-slate-700 text-center"
          >
            Skip for now
          </button>
        </div>
      </div>
    </motion.div>
  );
}

