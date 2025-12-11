'use client';

import { useEffect, useMemo, useRef, useState, ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2 as Loader,
  Sparkles,
  RotateCcw,
  X,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  MessageSquare,
  Copy,
  ArrowUp,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from 'fumadocs-ui/utils/cn';
import {
  DEV_PLACEHOLDER_PROMPT,
  DEV_SAMPLE_RESPONSE,
  DEV_TRANSCRIPT_CONTENT,
  IS_LOCAL_DEV,
} from './askai-dev';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import {
  Input as PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';

const API_URL = IS_LOCAL_DEV ? 'http://localhost:8787' : 'https://docs-ai-api.superwall.com';

const SDK_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'expo', label: 'Expo' },
  { value: 'flutter', label: 'Flutter' },
  { value: 'react-native', label: 'React Native (Deprecated)' },
] as const;

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
  isStreaming?: boolean;
  autofilled?: boolean;
  feedback?: {
    rating: 'positive' | 'negative';
    comment?: string;
    submitted?: boolean;
  };
  metrics?: {
    totalMs?: number;
    firstTokenMs?: number;
  };
};

type FeedbackState = Record<string, { showInput: boolean; comment: string }>;

interface AskAIProps extends ComponentProps<'div'> {
  initialQuery?: string | null;
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`);
const newUuid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
const formatSeconds = (ms: number) => (ms / 1000).toFixed(2);
const ACTION_BUTTON_CLASS = 'rounded p-1 transition-colors hover:bg-fd-accent cursor-pointer';

export default function AskAI({ className, initialQuery, ...props }: AskAIProps) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'ready' | 'submitting' | 'streaming'>('ready');
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>('superwall-ai-chat-history', []);
  const [selectedSdk, setSelectedSdk] = useLocalStorage<string>('superwall-ai-selected-sdk', '');
  const [showSdkDropdown, setShowSdkDropdown] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [showAutofillPill, setShowAutofillPill] = useState(false);
  const [autofillMessageId, setAutofillMessageId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({});
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [sdkHighlight, setSdkHighlight] = useState(0);
  const [conversationId, setConversationId] = useLocalStorage<string>(
    'superwall-ai-conversation-id',
    newUuid(),
  );
  const [thinkingDots, setThinkingDots] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const debugMenuRef = useRef<HTMLDivElement>(null);
  const devMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null!);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  };

  const scheduleScrollToBottom = () => {
    requestAnimationFrame(() => requestAnimationFrame(scrollToBottom));
  };


  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setConversationId(newUuid());
    }
  }, [conversationId, setConversationId]);

  // Migrate old card-based history into message pairs
  useEffect(() => {
    setMessages(prev => {
      if (!Array.isArray(prev)) return [];
      const looksLikeOld = prev.some((item: any) => 'question' in item && 'answer' in item);
      if (!looksLikeOld) return prev;
      const converted: ChatMessage[] = [];
      (prev as any[]).forEach((item, idx) => {
        if (item.question) {
          converted.push({
            id: `migrated-${idx}-u`,
            role: 'user',
            content: item.question,
          });
        }
        if (item.answer) {
          converted.push({
            id: `migrated-${idx}-a`,
            role: 'assistant',
            content: item.answer,
            isError: item.isError,
            feedback: item.feedback,
          });
        }
      });
      return converted;
    });
  }, [setMessages]);

  // Fetch user session (for feedback emails)
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.isLoggedIn && data.userInfo?.email) {
          setUserEmail(data.userInfo.email);
        }
      })
      .catch(err => console.error('Failed to fetch session:', err));
  }, []);

  // Enable debug UI when ?debug is present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setDebugMode(params.has('debug'));
  }, []);

  useEffect(() => {
    if (status === 'streaming') {
      const id = window.setInterval(() => {
        setThinkingDots(prev => (prev >= 3 ? 0 : prev + 1));
      }, 350);
      return () => window.clearInterval(id);
    }
    setThinkingDots(0);
    return;
  }, [status]);

  useEffect(() => {
    const idx = SDK_OPTIONS.findIndex(opt => opt.value === selectedSdk);
    setSdkHighlight(idx >= 0 ? idx : 0);
  }, [selectedSdk, showSdkDropdown]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && !e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        router.push('/ai');
        return;
      }

      if (isMeta && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowSdkDropdown(true);
        const idx = SDK_OPTIONS.findIndex(opt => opt.value === selectedSdk);
        setSdkHighlight(idx >= 0 ? idx : 0);
        return;
      }

      if (showSdkDropdown) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          setSdkHighlight(prev => {
            const delta = e.key === 'ArrowDown' ? 1 : -1;
            return (prev + delta + SDK_OPTIONS.length) % SDK_OPTIONS.length;
          });
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const opt = SDK_OPTIONS[sdkHighlight];
          if (opt) selectSdk(opt.value);
          return;
        }
        if (e.key === 'Escape') {
          setShowSdkDropdown(false);
          return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSdkDropdown, selectedSdk, sdkHighlight, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowSdkDropdown(false);
      }
      if (debugMenuRef.current && !debugMenuRef.current.contains(target)) {
        setShowDebugMenu(false);
      }
      if (devMenuRef.current && !devMenuRef.current.contains(target)) {
        setShowDevMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length]);

  useEffect(() => {
    scheduleScrollToBottom();
  }, [messages]);

  // Auto-run initial query
  useEffect(() => {
    if (initialQuery && messages.length === 0 && status === 'ready') {
      setShowAutofillPill(true);
      sendPrompt(initialQuery, { markAutofill: true });
    }
  }, [initialQuery, messages.length, status]);

  const selectSdk = (sdkValue: string) => {
    setSelectedSdk(sdkValue);
    setShowSdkDropdown(false);
  };

  const getSelectedSdk = () => {
    const found = SDK_OPTIONS.find(opt => opt.value === selectedSdk);
    return found || SDK_OPTIONS[0];
  };

  const sendFeedbackToAPI = async (
    messageId: string,
    rating: 'positive' | 'negative',
    comment: string,
  ) => {
    const idx = messagesRef.current.findIndex(m => m.id === messageId);
    if (idx === -1) return;

    const answer = messagesRef.current[idx]?.content;
    const question =
      [...messagesRef.current.slice(0, idx)].reverse().find(m => m.role === 'user')?.content ?? '';

    try {
      const response = await fetch('/docs/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ai',
          question,
          answer,
          rating,
          comment: comment || undefined,
          email: userEmail || undefined,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send feedback:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send feedback:', error);
    }
  };

  const handleFeedback = (messageId: string, rating: 'positive' | 'negative') => {
    const item = messages.find(m => m.id === messageId);

    if (item?.feedback?.submitted) return;

    if (item?.feedback?.rating === rating && !item.feedback.comment) {
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, feedback: undefined } : m)),
      );
      setFeedbackState(prev => ({
        ...prev,
        [messageId]: { showInput: false, comment: '' },
      }));
      return;
    }

    setMessages(prev =>
      prev.map(m =>
        m.id === messageId
          ? {
              ...m,
              feedback: { rating, comment: feedbackState[messageId]?.comment || '' },
            }
          : m,
      ),
    );
    setFeedbackState(prev => ({
      ...prev,
      [messageId]: { showInput: true, comment: '' },
    }));
  };

  const submitFeedbackComment = (messageId: string) => {
    const comment = feedbackState[messageId]?.comment || '';
    const item = messages.find(m => m.id === messageId);
    if (!item?.feedback) return;

    setMessages(prev =>
      prev.map(m =>
        m.id === messageId && m.feedback
          ? { ...m, feedback: { ...m.feedback, comment, submitted: true } }
          : m,
      ),
    );
    setFeedbackState(prev => ({
      ...prev,
      [messageId]: { ...prev[messageId], showInput: false },
    }));
    sendFeedbackToAPI(messageId, item.feedback.rating, comment);
  };

  const updateFeedbackComment = (messageId: string, comment: string) => {
    setFeedbackState(prev => ({
      ...prev,
      [messageId]: { ...prev[messageId], comment },
    }));
  };

  const removeExchange = (assistantId: string) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === assistantId);
      if (idx === -1) return prev;
      const prevUserIdx = [...prev.slice(0, idx)].reverse().findIndex(m => m.role === 'user');
      const removeFrom = prevUserIdx === -1 ? idx : idx - prevUserIdx - 1;
      const next = [...prev];
      next.splice(removeFrom, idx - removeFrom + 1);
      return next;
    });
  };

  const retryExchange = (assistantId: string) => {
    let userContent: string | undefined;
    let userAutofill: boolean | undefined;
    let nextMessages: ChatMessage[] | null = null;

    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === assistantId);
      if (idx === -1) return prev;

      const prevUserIdx = [...prev.slice(0, idx)].reverse().findIndex(m => m.role === 'user');
      const removeFrom = prevUserIdx === -1 ? idx : idx - prevUserIdx - 1;
      const next = [...prev];
      if (prevUserIdx !== -1) {
        userContent = prev[removeFrom].content;
        userAutofill = prev[removeFrom].autofilled;
      }
      next.splice(removeFrom, idx - removeFrom + 1);
      nextMessages = next;
      return next;
    });

    if (nextMessages) {
      messagesRef.current = nextMessages;
    }

    if (userContent) {
      sendPrompt(userContent, { markAutofill: userAutofill });
    }
  };

  const clearConversation = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput('');
    setShowAutofillPill(false);
    setAutofillMessageId(null);
    setConversationId(newUuid());
    setStatus('ready');
  };

  const findLastAssistantIndex = (arr: ChatMessage[]) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].role === 'assistant') return i;
    }
    return -1;
  };

  const findNextAssistantId = (startIndex: number, arr: ChatMessage[]) => {
    for (let i = startIndex + 1; i < arr.length; i++) {
      if (arr[i].role === 'assistant') return arr[i].id;
    }
    return null;
  };

  const ensureDevUserAndAddAssistant = (assistantMessage: ChatMessage) => {
    setMessages(prev => {
      const next = [...prev];

      if (next.length === 0 || next[next.length - 1].role === 'assistant') {
        next.push({
          id: newId(),
          role: 'user',
          content: DEV_PLACEHOLDER_PROMPT,
        });
      }

      next.push(assistantMessage);
      return next;
    });
    scheduleScrollToBottom();
  };

  const updateLastAssistant = (updater: (msg: ChatMessage) => ChatMessage) => {
    setMessages(prev => {
      const next = [...prev];
      const idx = findLastAssistantIndex(next);
      if (idx === -1) {
        next.push(
          updater({
            id: newId(),
            role: 'assistant',
            content: '',
          }),
        );
      } else {
        next[idx] = updater(next[idx]);
      }
      return next;
    });
  };

  const seedSimulatedChat = () => {
    abortRef.current?.abort();

    const transcript: ChatMessage[] = DEV_TRANSCRIPT_CONTENT.map(item => ({
      id: newId(),
      role: item.role,
      content: item.content,
      isError: false,
      isStreaming: false,
    }));

    setMessages(transcript);
    scheduleScrollToBottom();
    setInput('');
    setShowAutofillPill(false);
    setAutofillMessageId(null);
    setConversationId(newUuid());
    setStatus('ready');
  };

  const markAssistantLoading = () => {
    setStatus('streaming');
    ensureDevUserAndAddAssistant({
      id: newId(),
      role: 'assistant',
      content: '',
      isStreaming: true,
      isError: false,
    });
  };

  const markAssistantErrored = () => {
    setStatus('ready');
    ensureDevUserAndAddAssistant({
      id: newId(),
      role: 'assistant',
      content: '**Error** – please try again.',
      isStreaming: false,
      isError: true,
    });
  };

  const setAssistantSampleResponse = () => {
    setStatus('ready');
    ensureDevUserAndAddAssistant({
      id: newId(),
      role: 'assistant',
      content: DEV_SAMPLE_RESPONSE,
      isStreaming: false,
      isError: false,
    });
  };

  const sendPrompt = async (rawText: string, options?: { markAutofill?: boolean }) => {
    const text = rawText.trim();
    if (!text) return;
    if (status === 'submitting' || status === 'streaming') return;

    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      content: text,
      autofilled: options?.markAutofill,
    };

    const assistantId = newId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    scheduleScrollToBottom();
    if (options?.markAutofill) {
      setAutofillMessageId(userMessage.id);
    }

    setInput('');
    setStatus('submitting');
    const startTime = performance.now();
    let firstTokenMs: number | null = null;

    const payloadMessages = [...messagesRef.current, userMessage]
      .filter(m => !m.isError)
      .map(m => ({ role: m.role, content: m.content }));
    
    try {

      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          sdks: selectedSdk ? [selectedSdk] : undefined,
          email: userEmail || undefined,
          chatId: conversationId
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error('Bad response');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      setStatus('streaming');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (firstTokenMs === null) {
          firstTokenMs = performance.now() - startTime;
        }
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? {
                  ...m,
                  content: accumulated,
                  isStreaming: true,
                  metrics:
                    firstTokenMs !== null
                      ? { ...(m.metrics ?? {}), firstTokenMs }
                      : m.metrics,
                }
              : m,
          ),
        );
      }

      accumulated += decoder.decode();
      const totalMs = performance.now() - startTime;

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: accumulated,
                isStreaming: false,
                isError: false,
                metrics: {
                  ...(m.metrics ?? {}),
                  totalMs,
                  firstTokenMs: m.metrics?.firstTokenMs ?? firstTokenMs ?? undefined,
                },
              }
            : m,
        ),
      );
      setStatus('ready');
      setShowAutofillPill(false);
    } catch (error) {
      if (abortRef.current?.signal.aborted) {
        setStatus('ready');
        setMessages(prev =>
          prev.map(m => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
        );
        return;
      }

      console.error('Chat error', error);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: '**Error** – please try again.', isError: true, isStreaming: false }
            : m,
        ),
      );
      setStatus('ready');
    } finally {
      abortRef.current = null;
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'streaming') {
      abortRef.current?.abort();
      return;
    }
    sendPrompt(input);
  };

  return (
    <div className={cn('relative flex flex-1 min-h-0 flex-col', className)} {...props}>
      <div className="relative flex flex-1 min-h-0 flex-col">
        <Conversation className="flex-1">
          <ConversationContent
            className={cn(
              'flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto px-4 pb-52 pt-6 sm:px-6',
              isHydrated && messages.length === 0 && 'justify-center',
            )}
            contentRef={scrollContainerRef}
          >
            {isHydrated && messages.length === 0 ? (
              <ConversationEmptyState
                icon={<MessageSquare className="size-8 text-fd-muted-foreground" />}
                title="Start a conversation"
                description="Ask anything about Superwall docs, SDKs, or dashboard."
              />
            ) : (
              messages.map((message, idx) => {
                const nextAssistantId = findNextAssistantId(idx, messages);
                return (
                <Message from={message.role} key={message.id}>
                  <div className="group/message relative space-y-0">
                    {message.autofilled && message.id === autofillMessageId && (
                      <span className="inline-flex rounded-full border border-fd-border px-2 py-[1px] text-[10px] text-fd-muted-foreground">
                        Autofilled
                      </span>
                    )}

                    <MessageContent
                      className={cn(
                        'leading-relaxed text-base text-foreground',
                        message.role === 'assistant'
                          ? 'bg-transparent text-foreground px-3 md:px-3.5'
                          : 'ml-auto max-w-[66%] rounded-xl border border-fd-border/50 bg-fd-muted/15 px-3 py-2 text-foreground shadow-sm md:max-w-[66%] md:px-3.5 md:py-2.5',
                      )}
                    >
                      {message.isError ? (
                        <div className="flex items-center gap-2 text-sm text-red-500/85">
                          <span>Error — please try again</span>
                          <button
                            onClick={() => retryExchange(message.id)}
                            className={ACTION_BUTTON_CLASS}
                            title="Retry"
                          >
                            <RotateCcw className="size-4" />
                          </button>
                        </div>
                      ) : message.isStreaming ? (
                        <div className="mt-3 inline-flex items-center gap-3 text-sm text-foreground">
                          <Loader className="size-4 animate-spin" />
                          <span className="inline-flex items-center gap-1">
                            Thinking{'.'.repeat(thinkingDots)}
                          </span>
                        </div>
                      ) : (
                        <MessageResponse>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content || '...'}
                          </ReactMarkdown>
                        </MessageResponse>
                      )}
                    </MessageContent>

                    {message.role === 'assistant' && !message.isStreaming && !message.isError && (
                      <div className="mt-1.5 flex flex-wrap items-center justify-start gap-2 text-xs text-fd-muted-foreground opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
                        {debugMode &&
                          message.metrics &&
                          (message.metrics.totalMs !== undefined ||
                            message.metrics.firstTokenMs !== undefined) && (
                            <div className="flex items-center gap-2 text-[11px] text-fd-muted-foreground">
                              {[
                                message.metrics.totalMs !== undefined
                                  ? `Total: ${formatSeconds(message.metrics.totalMs)}s`
                                  : null,
                                message.metrics.firstTokenMs !== undefined
                                  ? `TTFT: ${formatSeconds(message.metrics.firstTokenMs)}s`
                                  : null,
                              ]
                                .filter((part): part is string => Boolean(part))
                                .join(' • ')}
                            </div>
                          )}
                        <button
                          onClick={() => navigator.clipboard.writeText(message.content || '')}
                          className={ACTION_BUTTON_CLASS}
                          title="Copy"
                        >
                          <Copy className="size-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, 'positive')}
                          title={
                            message.feedback?.submitted
                              ? 'Feedback submitted'
                              : message.feedback?.rating === 'positive'
                                ? 'Click again to undo'
                                : 'Good response'
                          }
                          className={cn(
                            ACTION_BUTTON_CLASS,
                            message.feedback?.submitted
                              ? 'cursor-default'
                              : 'cursor-pointer',
                            message.feedback?.rating === 'positive' &&
                              'bg-green-100 dark:bg-green-900/30',
                          )}
                        >
                          <ThumbsUp
                            className={cn(
                              'size-3',
                              message.feedback?.rating === 'positive'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-fd-muted-foreground',
                            )}
                          />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, 'negative')}
                          title={
                            message.feedback?.submitted
                              ? 'Feedback submitted'
                              : message.feedback?.rating === 'negative'
                                ? 'Click again to undo'
                                : 'Poor response'
                          }
                          className={cn(
                            ACTION_BUTTON_CLASS,
                            message.feedback?.submitted
                              ? 'cursor-default'
                              : 'cursor-pointer',
                            message.feedback?.rating === 'negative' &&
                              'bg-red-100 dark:bg-red-900/30',
                          )}
                        >
                          <ThumbsDown
                            className={cn(
                              'size-3',
                              message.feedback?.rating === 'negative'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-fd-muted-foreground',
                            )}
                          />
                        </button>
                        <button
                          onClick={() => retryExchange(message.id)}
                          className={ACTION_BUTTON_CLASS}
                          title="Retry"
                        >
                          <RotateCcw className="size-3" />
                        </button>
                      </div>
                    )}

                    {message.role === 'user' && (
                      <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2 text-xs text-fd-muted-foreground opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
                        <button
                          onClick={() => navigator.clipboard.writeText(message.content || '')}
                          className={ACTION_BUTTON_CLASS}
                          title="Copy"
                        >
                          <Copy className="size-3" />
                        </button>
                        {nextAssistantId && (
                          <button
                            onClick={() => retryExchange(nextAssistantId)}
                            className={ACTION_BUTTON_CLASS}
                            title="Retry"
                          >
                            <RotateCcw className="size-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {!message.isError && feedbackState[message.id]?.showInput && (
                      <div className="rounded border border-fd-border bg-fd-accent/10 p-3 text-xs">
                        <p className="mb-2 mt-0 text-fd-muted-foreground">
                          Optional feedback (helps improve AI responses)
                        </p>
                        <div className="flex gap-2">
                          <textarea
                            placeholder="Tell us more..."
                            value={feedbackState[message.id]?.comment || ''}
                            onChange={e => updateFeedbackComment(message.id, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                submitFeedbackComment(message.id);
                              }
                            }}
                            rows={3}
                            className="flex-1 resize-y rounded border border-fd-border bg-fd-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-fd-primary"
                          />
                          <button
                            onClick={() => submitFeedbackComment(message.id)}
                            className="self-start rounded bg-fd-primary px-3 py-1 text-sm text-fd-primary-foreground hover:bg-fd-primary/90"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Message>
                );
              })
            )}
          </ConversationContent>
          <ConversationScrollButton target={scrollContainerRef.current} />
        </Conversation>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-transparent pb-3 sm:pb-5">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <div className="rounded-2xl border border-fd-border bg-fd-background/95 shadow-lg backdrop-blur">
            <PromptInput
              onSubmit={handleSubmit}
              className="flex flex-col gap-2 border-none bg-transparent p-3 sm:p-4 shadow-none"
            >
              <PromptInputTextarea
                ref={inputRef}
                placeholder="Ask anything about Superwall..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (status === 'streaming') {
                      abortRef.current?.abort();
                      return;
                    }
                    sendPrompt(input);
                  }
                }}
                className="min-h-[96px] w-full resize-none rounded-xl border-none bg-transparent p-0 text-sm text-foreground/90 md:text-base md:text-foreground focus:outline-none focus:ring-0 focus-visible:ring-0"
              />
              <PromptInputFooter className="flex items-center gap-2">
              <div className="flex flex-1 flex-nowrap items-center gap-2 overflow-visible text-xs text-fd-muted-foreground sm:min-w-0">
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowSdkDropdown(!showSdkDropdown)}
                    disabled={status !== 'ready'}
                    className={cn(
                      'flex h-[36px] min-w-[120px] items-center justify-between rounded-full border bg-transparent px-3 text-xs cursor-pointer',
                      'hover:bg-fd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary',
                      status !== 'ready' && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>SDK</span>
                      <div className="h-3 w-px bg-fd-border" />
                      <span>{getSelectedSdk()?.label || 'None'}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        'ml-2 size-3 transition-transform',
                        showSdkDropdown && 'rotate-180',
                      )}
                    />
                  </button>

                  {showSdkDropdown && (
                    <div className="absolute bottom-full left-0 z-50 mb-2 w-48 overflow-hidden rounded-[var(--radius-lg)] border border-fd-border bg-fd-background shadow-lg">
                      {SDK_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          onClick={() => selectSdk(option.value)}
                          className={cn(
                            'flex w-full items-center px-3 py-2 text-left text-sm hover:bg-fd-accent cursor-pointer',
                            selectedSdk === option.value && 'bg-fd-accent',
                          )}
                        >
                          <div
                            className={cn(
                              'mr-2 h-2 w-2 rounded-full border',
                              selectedSdk === option.value
                                ? 'border-fd-primary bg-fd-primary'
                                : 'border-fd-border',
                            )}
                          />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearConversation}
                  className="rounded-full border border-fd-border px-2.5 py-1.5 text-xs hover:bg-fd-accent cursor-pointer"
                  title="New Chat"
                >
                  New Chat
                </button>
                {debugMode && (
                  <div className="relative" ref={debugMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDebugMenu(prev => !prev);
                        setShowDevMenu(false);
                      }}
                      className="rounded-full border border-fd-border px-2.5 py-1.5 text-xs hover:bg-fd-accent cursor-pointer"
                      title="Debug info"
                    >
                      Debug
                    </button>
                    {showDebugMenu && (
                      <div className="absolute bottom-full left-full z-50 mb-2 ml-2 w-72 rounded-[var(--radius-lg)] border border-fd-border bg-fd-background p-2 shadow-lg">
                        <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wide text-fd-muted-foreground">
                          Debug info
                        </p>
                        <div className="flex items-center justify-between rounded px-2 py-2 text-[11px] text-fd-muted-foreground">
                          <span className="truncate">Chat ID: {conversationId}</span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(conversationId || '')}
                            className="ml-2 rounded px-2 py-1 text-[11px] hover:bg-fd-accent cursor-pointer"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {IS_LOCAL_DEV && (
                  <div className="relative" ref={devMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDevMenu(prev => !prev);
                        setShowDebugMenu(false);
                      }}
                      className="rounded-full border border-fd-border px-2.5 py-1.5 text-xs hover:bg-fd-accent cursor-pointer"
                      title="Dev actions"
                    >
                      Dev
                    </button>
                    {showDevMenu && (
                      <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-[var(--radius-lg)] border border-fd-border bg-fd-background p-2 shadow-lg">
                        <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wide text-fd-muted-foreground">
                          Dev actions
                        </p>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              seedSimulatedChat();
                              setShowDevMenu(false);
                            }}
                            className="rounded px-2 py-2 text-left text-sm hover:bg-fd-accent cursor-pointer"
                          >
                            Clear chat & seed simulated chat
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              markAssistantLoading();
                              setShowDevMenu(false);
                            }}
                            className="rounded px-2 py-2 text-left text-sm hover:bg-fd-accent cursor-pointer"
                          >
                            Add bot message (loading)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              markAssistantErrored();
                              setShowDevMenu(false);
                            }}
                            className="rounded px-2 py-2 text-left text-sm hover:bg-fd-accent cursor-pointer"
                          >
                            Add bot message (errored)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAssistantSampleResponse();
                              setShowDevMenu(false);
                            }}
                            className="rounded px-2 py-2 text-left text-sm hover:bg-fd-accent cursor-pointer"
                          >
                            Add bot message (sample response)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <PromptInputSubmit
                disabled={!input.trim() && status !== 'streaming'}
                status={
                  status === 'streaming'
                    ? 'streaming'
                    : status === 'submitting'
                      ? 'submitting'
                      : 'ready'
                }
                className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full p-0 text-xs cursor-pointer disabled:cursor-not-allowed"
              >
              {status === 'ready' && <ArrowUp className="size-4" />}
              </PromptInputSubmit>
            </PromptInputFooter>
          </PromptInput>
          </div>
        </div>
      </div>
    </div>
  );
}