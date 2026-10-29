import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card, showToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, EnvelopeSimple, Lock, UserCircle } from '@phosphor-icons/react';

const magicLinkSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const passwordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
});

type MagicLinkFormValues = z.infer<typeof magicLinkSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type SignUpFormValues = z.infer<typeof signUpSchema>;

export const SignInForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [tab, setTab] = useState<'otp' | 'password' | 'signup'>('otp');
  const { signInWithOtp, signInWithPassword, signUp, isLoading } = useAuth();

  const otpForm = useForm<MagicLinkFormValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', displayName: '' },
  });

  const handleOtpSubmit = async (values: MagicLinkFormValues) => {
    try {
      await signInWithOtp(values.email);
      showToast.success('Magic link sent!', 'Check your email inbox for the sign-in link.');
      otpForm.reset();
    } catch (err: any) {
      showToast.error('Sign-in failed', err.message || 'Unable to send magic link.');
    }
  };

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    try {
      await signInWithPassword(values.email, values.password);
      showToast.success('Signed in', 'Welcome back to SafeSwap!');
      onSuccess?.();
    } catch (err: any) {
      showToast.error('Authentication failed', err.message || 'Incorrect email or password.');
    }
  };

  const handleSignUpSubmit = async (values: SignUpFormValues) => {
    try {
      await signUp(values.email, values.password, values.displayName, 'buyer');
      showToast.success('Account created', 'Please check your email to confirm registration.');
      setTab('otp');
    } catch (err: any) {
      showToast.error('Registration failed', err.message || 'Could not register account.');
    }
  };

  return (
    <Card padding="lg" className="w-full max-w-md mx-auto shadow-md">
      <Card.Header>
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-green rounded text-ink">
            <ShieldCheck size={22} weight="duotone" />
          </span>
          <h2 className="text-lg font-bold text-ink">Access SafeSwap</h2>
        </div>
      </Card.Header>

      <Card.Body className="space-y-4">
        {/* Tab switchers */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-cream border border-border rounded-md">
          <button
            type="button"
            onClick={() => setTab('otp')}
            className={`py-1.5 text-xs font-medium rounded-sm transition-colors ${
              tab === 'otp' ? 'bg-white shadow-sm text-ink border border-border' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => setTab('password')}
            className={`py-1.5 text-xs font-medium rounded-sm transition-colors ${
              tab === 'password' ? 'bg-white shadow-sm text-ink border border-border' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setTab('signup')}
            className={`py-1.5 text-xs font-medium rounded-sm transition-colors ${
              tab === 'signup' ? 'bg-white shadow-sm text-ink border border-border' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Register
          </button>
        </div>

        {/* Tab 1: Magic Link (OTP) */}
        {tab === 'otp' && (
          <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              placeholder="you@domain.com"
              type="email"
              autoComplete="email"
              leftIcon={<EnvelopeSimple size={18} className="text-ink-muted" />}
              error={otpForm.formState.errors.email?.message}
              hint="We will email you a secure login link. No password required."
              {...otpForm.register('email')}
            />
            <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
              Send Magic Link
            </Button>
          </form>
        )}

        {/* Tab 2: Password */}
        {tab === 'password' && (
          <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              placeholder="you@domain.com"
              type="email"
              autoComplete="email"
              leftIcon={<EnvelopeSimple size={18} className="text-ink-muted" />}
              error={passwordForm.formState.errors.email?.message}
              {...passwordForm.register('email')}
            />
            <Input
              label="Password"
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
              leftIcon={<Lock size={18} className="text-ink-muted" />}
              error={passwordForm.formState.errors.password?.message}
              {...passwordForm.register('password')}
            />
            <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
              Sign In
            </Button>
          </form>
        )}

        {/* Tab 3: Sign Up */}
        {tab === 'signup' && (
          <form onSubmit={signUpForm.handleSubmit(handleSignUpSubmit)} className="space-y-4">
            <Input
              label="Full Name or Business Name"
              placeholder="Maria Santos"
              leftIcon={<UserCircle size={18} className="text-ink-muted" />}
              error={signUpForm.formState.errors.displayName?.message}
              {...signUpForm.register('displayName')}
            />
            <Input
              label="Email Address"
              placeholder="maria@domain.com"
              type="email"
              autoComplete="email"
              leftIcon={<EnvelopeSimple size={18} className="text-ink-muted" />}
              error={signUpForm.formState.errors.email?.message}
              {...signUpForm.register('email')}
            />
            <Input
              label="Password"
              placeholder="At least 8 characters"
              type="password"
              autoComplete="new-password"
              leftIcon={<Lock size={18} className="text-ink-muted" />}
              error={signUpForm.formState.errors.password?.message}
              {...signUpForm.register('password')}
            />
            <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
              Create SafeSwap Account
            </Button>
          </form>
        )}
      </Card.Body>

      <Card.Footer className="text-center justify-center">
        <p className="text-xs text-ink-muted">
          Protected by SafeSwap Regulated Escrow Partner standards.
        </p>
      </Card.Footer>
    </Card>
  );
};
