import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card, showToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, EnvelopeSimple, Lock, UserCircle, Handshake, CheckCircle } from '@phosphor-icons/react';

const passwordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['buyer', 'seller', 'staff']),
});

type PasswordFormValues = z.infer<typeof passwordSchema>;
type SignUpFormValues = z.infer<typeof signUpSchema>;

export const SignInForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [tab, setTab] = useState<'demo' | 'password' | 'signup'>('demo');
  const { signInAsDemo, signInWithPassword, signUp, isLoading } = useAuth();

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: 'buyer@safeswap.dev', password: 'password123' },
  });

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', displayName: '', role: 'buyer' },
  });

  const handleDemoSelect = (role: 'buyer' | 'seller' | 'staff') => {
    const demo = signInAsDemo(role);
    showToast.success('Logged in as ' + demo.profile.display_name, `Active role: ${role.toUpperCase()}`);
    onSuccess?.();
  };

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    try {
      await signInWithPassword(values.email, values.password);
      showToast.success('Signed in', `Welcome back, ${values.email}!`);
      onSuccess?.();
    } catch (err: any) {
      showToast.error('Authentication failed', err.message || 'Incorrect credentials.');
    }
  };

  const handleSignUpSubmit = async (values: SignUpFormValues) => {
    try {
      await signUp(values.email, values.password, values.displayName, values.role);
      showToast.success('Account Created', `Welcome to SafeSwap, ${values.displayName}!`);
      onSuccess?.();
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
          <div>
            <h2 className="text-lg font-bold text-ink">Access SafeSwap</h2>
            <p className="text-xs text-ink-muted">Escrow Platform Simulation Prototype</p>
          </div>
        </div>
      </Card.Header>

      <Card.Body className="space-y-4">
        {/* Tab Switchers */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-cream border border-border rounded-md">
          <button
            type="button"
            onClick={() => setTab('demo')}
            className={`py-1.5 text-xs font-medium rounded-sm transition-colors ${
              tab === 'demo' ? 'bg-white shadow-sm text-ink border border-border font-bold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            1-Click Demo
          </button>
          <button
            type="button"
            onClick={() => setTab('password')}
            className={`py-1.5 text-xs font-medium rounded-sm transition-colors ${
              tab === 'password' ? 'bg-white shadow-sm text-ink border border-border font-bold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('signup')}
            className={`py-1.5 text-xs font-medium rounded-sm transition-colors ${
              tab === 'signup' ? 'bg-white shadow-sm text-ink border border-border font-bold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Register
          </button>
        </div>

        {/* Tab 1: Instant 1-Click Demo Login */}
        {tab === 'demo' && (
          <div className="space-y-3">
            <p className="text-xs text-ink-muted">
              Select an official simulation persona. No email or password needed:
            </p>

            <button
              type="button"
              onClick={() => handleDemoSelect('buyer')}
              className="w-full p-3 text-left border border-border rounded-md bg-white hover:bg-hover active:bg-pressed transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-bold text-ink">Buyer Alex</p>
                <p className="text-xs text-ink-muted font-mono">buyer@safeswap.dev</p>
                <span className="inline-block mt-1 text-[10px] font-semibold bg-lime text-ink px-1.5 py-0.5 rounded">
                  Funds deals & confirms receipt
                </span>
              </div>
              <Handshake size={24} className="text-ink-muted" />
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('seller')}
              className="w-full p-3 text-left border border-border rounded-md bg-white hover:bg-hover active:bg-pressed transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-bold text-ink">Seller Maria</p>
                <p className="text-xs text-ink-muted font-mono">seller@safeswap.dev</p>
                <span className="inline-block mt-1 text-[10px] font-semibold bg-cream border border-border text-ink px-1.5 py-0.5 rounded">
                  Uploads delivery proof & receives payouts
                </span>
              </div>
              <UserCircle size={24} className="text-ink-muted" />
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('staff')}
              className="w-full p-3 text-left border border-border rounded-md bg-white hover:bg-hover active:bg-pressed transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-bold text-ink">Staff Escrow Specialist</p>
                <p className="text-xs text-ink-muted font-mono">staff@safeswap.dev</p>
                <span className="inline-block mt-1 text-[10px] font-semibold bg-ink text-white px-1.5 py-0.5 rounded">
                  Verifies QR Ph deposits & releases payouts
                </span>
              </div>
              <ShieldCheck size={24} className="text-ink" />
            </button>
          </div>
        )}

        {/* Tab 2: Password Sign In */}
        {tab === 'password' && (
          <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              placeholder="e.g. test@gmail.com"
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

        {/* Tab 3: Sign Up (Direct Registration, No Email Verification) */}
        {tab === 'signup' && (
          <form onSubmit={signUpForm.handleSubmit(handleSignUpSubmit)} className="space-y-3">
            <Input
              label="Full Name or Business Name"
              placeholder="e.g. Juan dela Cruz"
              leftIcon={<UserCircle size={18} className="text-ink-muted" />}
              error={signUpForm.formState.errors.displayName?.message}
              {...signUpForm.register('displayName')}
            />
            <Input
              label="Email Address"
              placeholder="e.g. test@gmail.com"
              type="email"
              autoComplete="email"
              leftIcon={<EnvelopeSimple size={18} className="text-ink-muted" />}
              error={signUpForm.formState.errors.email?.message}
              {...signUpForm.register('email')}
            />
            <Input
              label="Password"
              placeholder="At least 4 characters"
              type="password"
              autoComplete="new-password"
              leftIcon={<Lock size={18} className="text-ink-muted" />}
              error={signUpForm.formState.errors.password?.message}
              {...signUpForm.register('password')}
            />

            <div>
              <label className="text-sm font-medium text-ink select-none block mb-1">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2 border border-border rounded-md bg-white cursor-pointer hover:bg-hover text-xs font-medium">
                  <input
                    type="radio"
                    value="buyer"
                    defaultChecked
                    {...signUpForm.register('role')}
                  />
                  <span>Buyer</span>
                </label>
                <label className="flex items-center gap-2 p-2 border border-border rounded-md bg-white cursor-pointer hover:bg-hover text-xs font-medium">
                  <input
                    type="radio"
                    value="seller"
                    {...signUpForm.register('role')}
                  />
                  <span>Seller</span>
                </label>
              </div>
            </div>

            <Button type="submit" variant="primary" fullWidth isLoading={isLoading} className="mt-2">
              Create SafeSwap Account (Instant)
            </Button>
          </form>
        )}
      </Card.Body>

      <Card.Footer className="text-center justify-center">
        <p className="text-xs text-ink-muted">
          Local prototype mode — no email confirmation required.
        </p>
      </Card.Footer>
    </Card>
  );
};

export default SignInForm;
