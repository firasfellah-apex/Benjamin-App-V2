import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { saveProfile } from '@/lib/profileMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserRound } from 'lucide-react';
import { useState } from 'react';
import { AvatarUploader } from '@/components/common/AvatarUploader';
import { toast } from 'sonner';

const Schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  avatar_url: z.string().url().optional().or(z.literal('')).optional(),
});

type FormValues = z.infer<typeof Schema>;

export default function ProfileOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
  });

  const onSubmit = async (values: FormValues) => {
    if (!user?.id) {
      toast.error('You must be logged in to complete onboarding');
      return;
    }

    try {
      await saveProfile(user.id, {
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone || null,
        avatar_url: avatarUrl || null,
      });

      toast.success('Profile saved successfully!');
      navigate('/customer/home', { replace: true });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error?.message || 'Failed to save profile. Please try again.');
    }
  };

  const handleAvatarUpload = (url: string) => {
    setAvatarUrl(url);
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-6 pt-8 pb-24 bg-[#F4F5F7]">
      <Card className="w-full max-w-md rounded-3xl shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold">
            Hello, I'm Benjamin — who am I serving today?
          </CardTitle>
          <CardDescription className="text-base">
            Tell us a few basics and you're all set.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Avatar picker */}
            <div className="flex flex-col items-center gap-4">
              <AvatarUploader
                currentAvatarUrl={avatarUrl}
                userName=""
                onUploadComplete={handleAvatarUpload}
              />
            </div>

            {/* First name and Last name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm font-medium">
                  First name
                </Label>
                <Input
                  id="first_name"
                  {...register('first_name')}
                  placeholder="Jane"
                  className="rounded-2xl"
                />
                {errors.first_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm font-medium">
                  Last name
                </Label>
                <Input
                  id="last_name"
                  {...register('last_name')}
                  placeholder="Doe"
                  className="rounded-2xl"
                />
                {errors.last_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone
              </Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="(305) 555-0123"
                inputMode="tel"
                className="rounded-2xl"
              />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save and Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

