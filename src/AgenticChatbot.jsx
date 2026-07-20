import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUp,
  Bot,
  LoaderCircle,
  MessageCircle,
  Sparkles,
  X,
} from 'lucide-react';

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

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';

const systemPrompt = `You are Vanguard, an elite AI real estate advisor. Help users analyze property markets, calculate budgets, and find homes. Be data-driven, strategic, polished, and concise. For budget questions, explain hypothetical PITI. Highlight appreciation, neighborhood dynamics, and investment considerations. Never claim access to live MLS data unless the user provides it.`;

async function fetchAIResponse(history, signal) {
  if (!apiKey || apiKey === 'your_actual_openai_api_key_here') {
    throw new Error('MISSING_KEY');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
      ],
    }),
    signal,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || 'API_ERROR');
  }

  return payload.choices?.[0]?.message?.content || 'I could not generate a response just now. Please try again.';
}

export default function AgenticChatbot() {
  const [open, setOpen] = useState(false);
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
  const requestRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking, open]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    requestRef.current?.abort();
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

    requestRef.current?.abort();
    requestRef.current = new AbortController();

    try {
      const response = await fetchAIResponse(history, requestRef.current.signal);
      setMessages((items) => [...items, { role: 'assistant', content: response }]);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setErrorState(
          error.message === 'MISSING_KEY'
            ? 'Vanguard is not configured yet. Add VITE_OPENAI_API_KEY and restart Vite.'
            : 'Vanguard could not connect right now. Check the API key, model access, and network connection.',
        );
      }
    } finally {
      setThinking(false);
      requestRef.current = null;
    }
  };

  return (
    <div className="chatbot">
      <div className={`chat-window ${open ? 'chat-window-open' : ''}`} aria-hidden={!open}>
        <header className="chat-header">
          <div className="agent-avatar"><Bot size={20} /></div>
          <div>
            <strong>Vanguard AI Advisor</strong>
            <span><i /> Online · {model}</span>
          </div>
          <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close chat">
            <X size={20} />
          </button>
        </header>

        <div className="chat-body">
          <div className="advisor-note"><Sparkles size={14} /> Your private property concierge</div>

          {messages.map((message, index) => (
            <div className={`message ${message.role === 'user' ? 'user' : 'ai'}`} key={`${message.role}-${index}`}>
              {message.role !== 'user' && <div className="tiny-avatar"><Bot size={14} /></div>}
              <p>{message.content}</p>
            </div>
          ))}

          {thinking && (
            <div className="message ai thinking">
              <div className="tiny-avatar"><Bot size={14} /></div>
              <p><LoaderCircle className="spin" size={16} /> {status}</p>
            </div>
          )}

          {errorState && (
            <div className="message ai">
              <div className="tiny-avatar"><AlertTriangle size={14} /></div>
              <p>{errorState}</p>
            </div>
          )}

          <div ref={endRef} />
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
