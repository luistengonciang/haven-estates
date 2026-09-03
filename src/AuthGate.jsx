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

  return <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-stone-50 shadow-2xl shadow-black/30 lg:grid-cols-[1.08fr_0.92fr]">
    <section className="relative hidden overflow-hidden bg-[#173f3b] p-12 text-stone-50 lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-300/15 blur-3xl" />
      <span className="relative text-lg font-semibold tracking-[0.25em]"><span className="mr-2 inline-grid h-8 w-8 place-items-center rounded-full bg-amber-300 font-serif text-xl tracking-normal text-[#173f3b]">H</span>HAVEN</span>
      <div className="relative max-w-md">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">A calmer way to find home</p>
        <h2 className="font-serif text-5xl leading-[1.05]">Your search, with an advisor who remembers.</h2>
        <p className="mt-6 max-w-sm text-base leading-7 text-stone-200">Create an account to save listings, ask Vanguard questions grounded in our local market knowledge, and request viewings.</p>
      </div>
      <div className="relative flex items-center gap-3 text-sm text-stone-200"><ShieldCheck className="text-amber-200" size={22} /><span>Private account access with Supabase Auth</span></div>
    </section>

    <section className="relative flex items-center p-6 sm:p-10 lg:p-12">
      <button type="button" onClick={onClose} aria-label="Close sign in" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"><X size={20} /></button>
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Member access</p>
          <h3 id="auth-dialog-title" className="mt-3 font-serif text-4xl tracking-tight text-stone-900">{isSignUp ? 'Create your account' : 'Welcome back'}</h3>
          <p className="mt-3 text-sm leading-6 text-stone-600">{reason || (isSignUp ? 'Save your preferences and access the Haven intelligence desk.' : 'Sign in to continue your home search.')}</p>
        </div>
        <div className="mb-7 grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-sm font-semibold"><button type="button" onClick={() => switchMode('signIn')} className={`rounded-lg px-3 py-2.5 transition ${!isSignUp ? 'bg-white text-[#173f3b] shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Sign in</button><button type="button" onClick={() => switchMode('signUp')} className={`rounded-lg px-3 py-2.5 transition ${isSignUp ? 'bg-white text-[#173f3b] shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Create account</button></div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          {isSignUp && <label className="block text-sm font-medium text-stone-700">Name<input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength="80" autoComplete="name" placeholder="How should we address you?" className="mt-2 block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-stone-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10" /></label>}
          <label className="block text-sm font-medium text-stone-700">Email address<div className="relative mt-2"><Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} /><input ref={emailRef} value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="you@example.com" className="block w-full rounded-xl border border-stone-300 bg-white py-3 pl-11 pr-4 text-base outline-none transition placeholder:text-stone-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10" /></div></label>
          <label className="block text-sm font-medium text-stone-700">Password<div className="relative mt-2"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} required minLength="8" placeholder={isSignUp ? 'At least 8 characters' : 'Your password'} className="block w-full rounded-xl border border-stone-300 bg-white py-3 pl-11 pr-4 text-base outline-none transition placeholder:text-stone-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10" /></div></label>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{error}</p>}
          {status && <p role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800"><CheckCircle2 className="mt-0.5 shrink-0" size={17} />{status}</p>}
          <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173f3b] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0e302c] focus:outline-none focus:ring-4 focus:ring-teal-700/25 disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting ? <LoaderCircle className="animate-spin" size={18} /> : <KeyRound size={18} />}{isSubmitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}{!isSubmitting && <ArrowRight size={17} />}</button>
        </form>
        <p className="mt-7 text-center text-sm text-stone-600">{isSignUp ? 'Already have an account?' : 'New to Haven?'} <button type="button" onClick={() => switchMode(isSignUp ? 'signIn' : 'signUp')} className="font-semibold text-teal-800 underline decoration-teal-800/30 underline-offset-4 hover:text-teal-950">{isSignUp ? 'Sign in' : 'Create an account'}</button></p>
        <p className="mt-4 text-center text-xs text-stone-500"><button type="button" onClick={onClose} className="underline underline-offset-4 hover:text-stone-700">Keep browsing without an account</button></p>
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
    return <button type="button" onClick={() => auth.requireAuth()} className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"><UserRound size={17} /> Sign in</button>;
  }

  const name = auth.user.user_metadata?.full_name || auth.user.email?.split('@')[0] || 'Account';

  return <><button type="button" onClick={auth.signOut} className="hidden items-center gap-2 text-sm font-semibold text-white/90 transition hover:text-amber-200 md:inline-flex" title={`Signed in as ${auth.user.email}`}><UserRound size={17} /><span className="max-w-28 truncate">{name}</span><LogOut size={16} aria-label="Sign out" /></button><button type="button" onClick={auth.signOut} className="grid h-9 w-9 place-items-center rounded-full border border-white/30 text-white transition hover:bg-white/10 md:hidden" aria-label="Sign out" title={`Signed in as ${auth.user.email}`}><LogOut size={17} /></button></>;
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
