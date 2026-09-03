import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUp,
  Bot,
  CheckCircle2,
  LoaderCircle,
  Maximize2,
  MessageCircle,
  Minimize2,
  Sparkles,
  X,
} from 'lucide-react';
import AIMessageBubble from './chat/AIMessageBubble';
import MarkdownMessage from './chat/MarkdownMessage';
import { useAuth } from './AuthGate';
import { supabase, supabaseConfigReady } from './lib/supabase';

const quickPrompts = [
  'What are homes going for in Morong?',
  'Compare house and condo prices in Bataan',
  'What should I check before buying here?',
];

const statusSteps = [
  'Analyzing intent & criteria...',
  'Searching Bataan property listings...',
  'Preparing a concise, grounded answer...',
];

const model = 'gpt-4o-mini';

function getUserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

async function fetchAIResponse(history, approvedAction = null, activeListing = null) {
  if (!supabase || !supabaseConfigReady) {
    throw new Error('MISSING_SUPABASE');
  }

  const { data, error } = await supabase.functions.invoke('vanguard-chat', {
    body: {
      messages: history,
      ...(approvedAction ? { approvedAction } : {}),
      ...(activeListing?.id ? { activeListing: { id: activeListing.id } } : {}),
      timeZone: getUserTimeZone(),
    },
  });

  if (error) {
    const payload = error.context instanceof Response
      ? await error.context.clone().json().catch(() => null)
      : null;
    const requestError = new Error(payload?.message || payload?.error || error.message);
    requestError.code = payload?.error;
    throw requestError;
  }
  if (data?.error) throw new Error(data.error);

  return {
    content: data?.content || 'I could not generate a response just now. Please try again.',
    sources: Array.isArray(data?.sources) ? data.sources : [],
    pendingAction: data?.pendingAction || null,
  };
}

export default function AgenticChatbot({ activeListing = null, initialDraft = '', isOpen = false, onOpenChange = null }) {
  const auth = useAuth();
  const [open, setOpen] = useState(isOpen);
  const [fullscreen, setFullscreen] = useState(false);
  const [input, setInput] = useState(initialDraft || '');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi, I’m Vanguard. I can help you locate premium properties, run investment projections, or evaluate market trends. What are we looking for today?',
    },
  ]);
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState(statusSteps[0]);
  const [errorState, setErrorState] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const timers = useRef([]);

  const handleOpen = (nextOpen) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (isOpen) {
      setOpen(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialDraft) {
      setInput(initialDraft);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          try {
            inputRef.current.setSelectionRange(initialDraft.length, initialDraft.length);
          } catch {
            // ignore range error on non-text inputs
          }
        }
      }, 120);
    }
  }, [initialDraft]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking, open]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
  }, []);

  // Move focus into the panel on open so keyboard users are not left behind on
  // the launcher, and let Escape close it like any other overlay.
  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape' && !fullscreen) handleOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, fullscreen]);

  const openChat = () => {
    if (!auth?.requireAuth('Sign in to ask Vanguard about these listings.')) return;
    handleOpen(true);
  };

  const sendMessage = async (value = input) => {
    const message = value.trim();
    if (!message || thinking) return;

    setErrorState(null);
    const history = [...messages, { role: 'user', content: message }];
    setMessages(history);
    setInput('');
    setThinking(true);
    setStatus(statusSteps[0]);

    timers.current.forEach(clearTimeout);
    timers.current = [
      setTimeout(() => setStatus(statusSteps[1]), 900),
      setTimeout(() => setStatus(statusSteps[2]), 1900),
    ];

    try {
      const response = await fetchAIResponse(history, null, activeListing);
      setMessages((items) => [...items, { role: 'assistant', ...response }]);
    } catch (error) {
      // Keep operator detail in the console; visitors get something actionable.
      if (error.message === 'MISSING_SUPABASE') console.error('Vanguard: Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart Vite.');
      else console.error('Vanguard request failed:', error);
      setErrorState(
        error.message === 'RETRIEVAL_UNAVAILABLE'
          ? 'Vanguard could not reach its reference data just now. Try again in a moment.'
          : 'Vanguard is unavailable right now. Please try again in a moment — your listings and search still work.',
      );
    } finally {
      setThinking(false);
    }
  };

  const approveAction = async (messageIndex, pendingAction) => {
    if (thinking) return;
    setErrorState(null);
    setThinking(true);
    setStatus('Submitting your viewing request...');
    setMessages((items) => items.map((item, index) => index === messageIndex
      ? { ...item, actionState: 'approving' }
      : item));
    try {
      const response = await fetchAIResponse(messages, pendingAction, activeListing);
      setMessages((items) => [...items, { role: 'assistant', ...response }]);
    } catch (error) {
      setErrorState(
        error.code === 'VIEWING_REQUEST_FAILED'
          ? error.message
          : 'Vanguard could not submit that request. Please try again.',
      );
      setMessages((items) => items.map((item, index) => index === messageIndex
        ? { ...item, actionState: null }
        : item));
    } finally {
      setThinking(false);
    }
  };

  const cancelAction = (messageIndex) => {
    setMessages((items) => items.map((item, index) => index === messageIndex
      ? { ...item, actionState: 'cancelled', pendingAction: null }
      : item));
  };

  return (
    <div className="chatbot">
      <div className={`chat-window ${open ? 'chat-window-open' : ''} ${fullscreen ? 'chat-window-fullscreen' : ''}`} role="dialog" aria-label="Vanguard AI advisor" inert={!open}>
        <header className="chat-header">
          <div className="agent-avatar"><Bot size={20} /></div>
          <div>
            <strong>Vanguard AI Advisor</strong>
            <span><i /> Online · {model}</span>
          </div>
          <button className="icon-button" onClick={() => setFullscreen((value) => !value)} aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}>
            {fullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
          </button>
          <button className="icon-button" onClick={() => handleOpen(false)} aria-label="Close chat">
            <X size={20} />
          </button>
        </header>

        <div className="chat-body flex flex-col gap-3">
          <div className="advisor-note !mb-1"><Sparkles size={14} /> Your private property concierge</div>

          {messages.map((message, index) => (
            <div className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`} key={`${message.role}-${index}`}>
              {message.role !== 'user' && <div className="tiny-avatar"><Bot size={14} /></div>}
              <div className="max-w-[min(100%,42rem)]">
                <AIMessageBubble role={message.role}><MarkdownMessage>{message.content}</MarkdownMessage></AIMessageBubble>
                {message.role === 'assistant' && message.sources?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                    {message.sources.map((source, sourceIndex) => (
                      source.source_url
                        ? <a key={`${source.id}-${sourceIndex}`} className="rounded-full border border-slate-200 bg-white px-2 py-1 hover:border-emerald-300 hover:text-emerald-800" href={source.source_url} target="_blank" rel="noreferrer">Source {sourceIndex + 1}: {source.title}</a>
                        : <span key={`${source.id}-${sourceIndex}`} className="rounded-full border border-slate-200 bg-white px-2 py-1">Source {sourceIndex + 1}: {source.title}</span>
                    ))}
                  </div>
                )}
                {message.pendingAction && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
                    <div className="flex items-center gap-2 font-semibold"><CheckCircle2 size={15} /> Viewing request</div>
                    <p className="mt-2 leading-5">Preferred date: <strong>{message.pendingAction.arguments?.preferred_date || 'Not specified'}</strong>{message.pendingAction.arguments?.preferred_time ? ` at ${message.pendingAction.arguments.preferred_time}` : ''}</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" className="rounded-lg bg-emerald-800 px-3 py-2 font-semibold text-white disabled:opacity-50" disabled={thinking || message.actionState === 'approving'} onClick={() => approveAction(index, message.pendingAction)}>{message.actionState === 'approving' ? 'Submitting...' : 'Confirm request'}</button>
                      <button type="button" className="rounded-lg border border-emerald-300 bg-white px-3 py-2 font-semibold text-emerald-900 disabled:opacity-50" disabled={thinking || message.actionState === 'approving'} onClick={() => cancelAction(index)}>Cancel</button>
                    </div>
                  </div>
                )}
                {message.actionState === 'cancelled' && <p className="mt-2 text-xs text-slate-500">Viewing request cancelled.</p>}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex items-end gap-2">
              <div className="tiny-avatar"><Bot size={14} /></div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-emerald-950/8 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm"><LoaderCircle className="spin" size={16} /> {status}</div>
            </div>
          )}

          {errorState && (
            <div className="flex items-end gap-2">
              <div className="tiny-avatar"><AlertTriangle size={14} /></div>
              <div className="max-w-[min(100%,42rem)] rounded-2xl rounded-tl-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">{errorState}</div>
            </div>
          )}

          <div ref={endRef} className="h-px" />
        </div>

        <div className="chat-footer">
          <div className="quick-prompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} onClick={() => sendMessage(prompt)} disabled={thinking}>
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
            {/* Deliberately editable while a reply is in flight — people compose
                their next question as they read. Only sending is blocked. */}
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Vanguard anything..."
              aria-label="Message Vanguard"
            />
            <button
              type="submit"
              className="send-button"
              aria-label="Send message"
              disabled={!input.trim() || thinking}
            >
              <ArrowUp size={18} />
            </button>
          </form>
        </div>
      </div>

      <button
        className="chat-fab"
        onClick={() => (open ? handleOpen(false) : openChat())}
        aria-label={open ? 'Close advisor chat' : 'Open advisor chat'}
        aria-expanded={open}
      >
        {open ? <X size={24} /> : <><MessageCircle size={23} /><span>Ask Vanguard</span></>}
      </button>
    </div>
  );
}
