import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, LoaderCircle, LockKeyhole, LogOut, Mail, ShieldCheck, UserRound, X } from 'lucide-react';
import { supabase, supabaseConfigReady } from './lib/supabase';

const AuthContext = createContext(null);

async function ensureProfile(user) {
  if (!supabase || !user) return;

  const displayName = user.user_metadata?.full_name?.trim() || null;
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (error) console.warn('Could not save the user profile:', error.message);
}

function AuthPanel({ reason, onClose }) {
  const [mode, setMode] = useState('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignUp = mode === 'signUp';
  const emailRef = useRef(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  function switchMode(nextMode) {
    setMode(nextMode);
    setStatus('');
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!supabase) return;
    setError('');
    setStatus('');
    setIsSubmitting(true);

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: window.location.origin,
        },
      });
      if (signUpError) setError(signUpError.message);
      else if (data.session) setStatus('Your account is ready. Welcome to Haven.');
      else setStatus('Check your inbox to confirm your email, then return here to sign in.');
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
      else {
        await ensureProfile(data.user);
        setStatus('Signed in successfully.');
      }
    }
    setIsSubmitting(false);
  }

  return <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-black/40 lg:grid-cols-[1.05fr_0.95fr]">
    {/* Left Editorial Branding Banner */}
    <section className="relative hidden overflow-hidden bg-[#122a1f] p-12 text-stone-50 lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#beef68]/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-[#beef68]/5 blur-3xl" />
      
      <span className="relative flex items-center gap-2 font-mono text-base font-semibold tracking-[0.2em] text-white">
        <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-[#beef68] font-serif text-xl font-bold tracking-normal text-[#122a1f]">H</span>
        HAVEN ESTATES
      </span>

      <div className="relative max-w-md my-auto">
        <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#beef68]">Exclusive Member Privileges</p>
        <h2 className="font-['Playfair_Display'] text-4xl font-bold leading-[1.12] text-white">Find your sanctuary with intelligence on your side.</h2>
        <div className="mt-8 space-y-4 text-sm text-stone-200">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#beef68]/20 text-[#beef68] text-xs font-bold">✓</span>
            <p className="leading-relaxed"><strong className="text-white">Cloud Wishlist Sync:</strong> Save and organize properties across devices with a single tap.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#beef68]/20 text-[#beef68] text-xs font-bold">✓</span>
            <p className="leading-relaxed"><strong className="text-white">Vanguard AI Advisor:</strong> Access deep real estate retrieval on pricing, zoning, and legal tips.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#beef68]/20 text-[#beef68] text-xs font-bold">✓</span>
            <p className="leading-relaxed"><strong className="text-white">Priority Viewings:</strong> Schedule private in-person walkthroughs with Melissa Barlin.</p>
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-3 font-mono text-xs text-stone-300">
        <ShieldCheck className="text-[#beef68]" size={20} />
        <span>Secured via Supabase Enterprise Auth</span>
      </div>
    </section>

    {/* Right Form Panel */}
    <section className="relative flex items-center p-8 sm:p-12">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close sign in"
        className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-800"
      >
        <X size={20} />
      </button>

      <div className="mx-auto w-full max-w-sm">
        <div className="mb-7">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#285740]">Member Sanctuary</p>
          <h3 id="auth-dialog-title" className="mt-2 font-['Playfair_Display'] text-3xl font-bold tracking-tight text-[#16291f]">
            {isSignUp ? 'Create your Haven account' : 'Welcome back to Haven'}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            {reason || (isSignUp ? 'Join to save listings and access the Vanguard intelligence engine.' : 'Sign in to access your saved homes and scheduled viewings.')}
          </p>
        </div>

        {/* High-Contrast Segmented Switcher */}
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => switchMode('signIn')}
            className={`rounded-lg py-2.5 transition ${!isSignUp ? 'bg-white text-[#122a1f] shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode('signUp')}
            className={`rounded-lg py-2.5 transition ${isSignUp ? 'bg-white text-[#122a1f] shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
          >
            Create account
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isSignUp && (
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
              Your Name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                maxLength="80"
                autoComplete="name"
                placeholder="e.g. Maria Santos"
                className="mt-1.5 block w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-2.5 text-sm font-medium text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#173c2c] focus:bg-white focus:ring-4 focus:ring-[#173c2c]/10"
              />
            </label>
          )}

          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
            Email address
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input
                ref={emailRef}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="block w-full rounded-xl border border-stone-200 bg-stone-50/60 py-2.5 pl-10 pr-3.5 text-sm font-medium text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#173c2c] focus:bg-white focus:ring-4 focus:ring-[#173c2c]/10"
              />
            </div>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
            Password
            <div className="relative mt-1.5">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                minLength="8"
                placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
                className="block w-full rounded-xl border border-stone-200 bg-stone-50/60 py-2.5 pl-10 pr-3.5 text-sm font-medium text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#173c2c] focus:bg-white focus:ring-4 focus:ring-[#173c2c]/10"
              />
            </div>
          </label>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}
          {status && <p role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><CheckCircle2 className="mt-0.5 shrink-0" size={15} />{status}</p>}

          <button
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173c2c] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#21523c] focus:outline-none focus:ring-4 focus:ring-[#173c2c]/20 disabled:cursor-not-allowed disabled:opacity-70 mt-2"
          >
            {isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <KeyRound size={17} />}
            {isSubmitting ? 'Please wait…' : isSignUp ? 'Create Haven Account' : 'Sign In to Haven'}
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-500">
          {isSignUp ? 'Already have an account?' : 'New to Haven?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(isSignUp ? 'signIn' : 'signUp')}
            className="font-bold text-[#173c2c] underline underline-offset-4 hover:text-[#285740]"
          >
            {isSignUp ? 'Sign in' : 'Create an account'}
          </button>
        </p>
        <p className="mt-3 text-center text-[11px] text-stone-400">
          <button type="button" onClick={onClose} className="hover:text-stone-600 hover:underline">
            Keep browsing freely without an account
          </button>
        </p>
      </div>
    </section>
  </div>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthControls() {
  const auth = useAuth();
  if (!auth) return null;

  if (!auth.user) {
    return (
      <button
        type="button"
        onClick={() => auth.requireAuth()}
        className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white hover:text-[#122a1f]"
      >
        <UserRound size={15} /> Sign in
      </button>
    );
  }

  const name = auth.user.user_metadata?.full_name || auth.user.email?.split('@')[0] || 'Account';

  return (
    <>
      <button
        type="button"
        onClick={auth.signOut}
        className="hidden items-center gap-2 text-xs font-semibold text-white/90 transition hover:text-[#beef68] md:inline-flex bg-white/10 border border-white/20 rounded-full px-3 py-1.5"
        title={`Signed in as ${auth.user.email}. Click to sign out.`}
      >
        <span className="h-2 w-2 rounded-full bg-[#beef68] shadow-[0_0_8px_#beef68]" />
        <span className="max-w-28 truncate">{name}</span>
        <LogOut size={14} className="text-white/60 hover:text-white" aria-label="Sign out" />
      </button>
      <button
        type="button"
        onClick={auth.signOut}
        className="grid h-8 w-8 place-items-center rounded-full border border-white/25 text-white transition hover:bg-white/10 md:hidden"
        aria-label="Sign out"
        title={`Signed in as ${auth.user.email}`}
      >
        <LogOut size={15} />
      </button>
    </>
  );
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // A string reason when the sign-in overlay is open, null when it is closed.
  const [authPrompt, setAuthPrompt] = useState(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return undefined;
    }
    let active = true;
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!active) return;
      setSession(currentSession);
      setIsLoading(false);
      if (currentSession) void ensureProfile(currentSession.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
      if (nextSession) queueMicrotask(() => { void ensureProfile(nextSession.user); });
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const closePrompt = useCallback(() => {
    setAuthPrompt(null);
    restoreFocusRef.current?.focus?.();
    restoreFocusRef.current = null;
  }, []);

  // Signing in satisfies whatever the user was trying to do, so get out of the way.
  useEffect(() => { if (session) setAuthPrompt(null); }, [session]);

  useEffect(() => {
    if (authPrompt === null) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') closePrompt(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authPrompt, closePrompt]);

  /** Returns true when the action can proceed; otherwise opens the sign-in overlay. */
  const requireAuth = useCallback((reason = '') => {
    if (session) return true;
    restoreFocusRef.current = document.activeElement;
    setAuthPrompt(reason);
    return false;
  }, [session]);

  const signOut = useCallback(() => { void supabase?.auth.signOut(); }, []);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, isLoading, requireAuth, signOut }),
    [session, isLoading, requireAuth, signOut],
  );

  if (!supabaseConfigReady) return <main className="grid min-h-screen place-items-center bg-stone-950 p-6 text-center text-stone-100"><div><h1 className="font-serif text-3xl">Haven needs its Supabase connection.</h1><p className="mt-3 max-w-md text-stone-300">Add the public Supabase URL and publishable key to <code>.env.local</code>, then restart the app.</p></div></main>;

  return <AuthContext.Provider value={value}>
    {children}
    {authPrompt !== null && <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 px-4 py-8 backdrop-blur-sm sm:px-6" role="presentation" onMouseDown={closePrompt}>
      <div role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <AuthPanel reason={authPrompt} onClose={closePrompt} />
      </div>
    </div>}
  </AuthContext.Provider>;
}
