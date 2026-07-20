import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUp,
  Bot,
  LoaderCircle,
  Maximize2,
  MessageCircle,
  Minimize2,
  Sparkles,
  X,
} from 'lucide-react';
import AIMessageBubble from './chat/AIMessageBubble';
import MarkdownMessage from './chat/MarkdownMessage';
import { supabase, supabaseConfigReady } from './lib/supabase';

const quickPrompts = [
  'Analyze market trends',
  'Calculate max budget',
  'Find 3-bed homes near me',
];

const statusSteps = [
  'Analyzing intent & criteria...',
  'Scanning off-market MLS registry...',
  'Running predictive ROI algorithms...',
];

const model = 'gpt-4o-mini';

async function retrieveKnowledge(query) {
  if (!supabase || !supabaseConfigReady) return [];

  const { data, error } = await supabase.functions.invoke('rag-retrieve', {
    body: { query, matchCount: 5 },
  });

  if (error) throw error;
  return data?.documents ?? [];
}

async function fetchAIResponse(history, retrievedDocuments = []) {
  if (!supabase || !supabaseConfigReady) {
    throw new Error('MISSING_SUPABASE');
  }

  const { data, error } = await supabase.functions.invoke('vanguard-chat', {
    body: {
      messages: history,
      documents: retrievedDocuments,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data?.content || 'I could not generate a response just now. Please try again.';
}

export default function AgenticChatbot() {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [input, setInput] = useState('');
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
  const timers = useRef([]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking, open]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
  }, []);

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
      let retrievedDocuments = [];
      try {
        retrievedDocuments = await retrieveKnowledge(message);
      } catch (retrievalError) {
        console.warn('Supabase RAG retrieval unavailable:', retrievalError);
      }

      const response = await fetchAIResponse(
        history,
        retrievedDocuments,
      );
      setMessages((items) => [...items, { role: 'assistant', content: response }]);
    } catch (error) {
      setErrorState(
        error.message === 'MISSING_SUPABASE'
          ? 'Vanguard is not configured yet. Add the Supabase publishable settings and restart Vite.'
          : 'Vanguard could not connect right now. Check the Supabase Edge Function secrets, deployment, and network connection.',
      );
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="chatbot">
      <div className={`chat-window ${open ? 'chat-window-open' : ''} ${fullscreen ? 'chat-window-fullscreen' : ''}`} aria-hidden={!open}>
        <header className="chat-header">
          <div className="agent-avatar"><Bot size={20} /></div>
          <div>
            <strong>Vanguard AI Advisor</strong>
            <span><i /> Online · {model}</span>
          </div>
          <button className="icon-button" onClick={() => setFullscreen((value) => !value)} aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}>
            {fullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
          </button>
          <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close chat">
            <X size={20} />
          </button>
        </header>

        <div className="chat-body flex flex-col gap-3">
          <div className="advisor-note !mb-1"><Sparkles size={14} /> Your private property concierge</div>

          {messages.map((message, index) => (
            <div className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`} key={`${message.role}-${index}`}>
              {message.role !== 'user' && <div className="tiny-avatar"><Bot size={14} /></div>}
              <AIMessageBubble role={message.role}><MarkdownMessage>{message.content}</MarkdownMessage></AIMessageBubble>
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
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Vanguard anything..."
              aria-label="Message Vanguard"
              disabled={thinking}
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
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close advisor chat' : 'Open advisor chat'}
      >
        {open ? <X size={24} /> : <><MessageCircle size={23} /><span>Ask Vanguard</span></>}
      </button>
    </div>
  );
}
