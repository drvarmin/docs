'use client';

import { useState, useEffect, useRef } from 'react';
import { Copy, Eye, ExternalLink, ChevronDown, LoaderCircle, Check } from 'lucide-react';
import { cn } from 'fumadocs-ui/utils/cn';

interface CopyPageButtonProps {
  disabled?: boolean;
  currentPath: string;
}

export function CopyPageButton({ disabled = false, currentPath }: CopyPageButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (disabled) {
    return null;
  }

  const getMarkdownUrl = () => {
    const baseUrl = window.location.origin;
    const cleanPath = currentPath.startsWith('/') ? currentPath : `/${currentPath}`;
    return `${baseUrl}/docs${cleanPath}.md`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Add toast notification
      console.log('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleCopyMarkdown = async () => {
    setIsLoading(true);
    try {
      const markdownUrl = getMarkdownUrl();
      const response = await fetch(markdownUrl);
      if (!response.ok) throw new Error('Failed to fetch markdown');
      
      const markdown = await response.text();
      await copyToClipboard(markdown);
      
      // Show copied state
      setIsCopied(true);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Reset after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
      // TODO: Add error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMarkdown = () => {
    const markdownUrl = getMarkdownUrl();
    window.open(markdownUrl, '_blank');
    setIsOpen(false);
  };

  const handleOpenInChatGPT = async () => {
    setIsLoading(true);
    try {
      const markdownUrl = getMarkdownUrl();
      const prompt = `Read ${markdownUrl} and answer questions about the content.`;
      const encodedPrompt = encodeURIComponent(prompt);
      const chatGPTUrl = `https://chat.openai.com/?q=${encodedPrompt}`;
      
      window.open(chatGPTUrl, '_blank');
    } catch (err) {
      console.error('Failed to open in ChatGPT:', err);
      // TODO: Add error toast
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const handleOpenInClaude = async () => {
    setIsLoading(true);
    try {
      const markdownUrl = getMarkdownUrl();
      const prompt = `Read ${markdownUrl} and answer questions about the content.`;
      const encodedPrompt = encodeURIComponent(prompt);
      const claudeUrl = `https://claude.ai/new?q=${encodedPrompt}`;
      
      window.open(claudeUrl, '_blank');
    } catch (err) {
      console.error('Failed to open in Claude:', err);
      // TODO: Add error toast
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Split Button */}
      <div className="inline-flex rounded-md border border-fd-border bg-fd-background w-28">
        {/* Left side - Copy button */}
        <button
          onClick={handleCopyMarkdown}
          disabled={isLoading || isCopied}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-l-md flex-1 min-w-0",
            "hover:bg-fd-accent hover:text-fd-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-2",
            "disabled:opacity-50 disabled:pointer-events-none",
            "transition-colors"
          )}
        >
          {isLoading ? (
            <LoaderCircle className="size-3 animate-spin flex-shrink-0" />
          ) : isCopied ? (
            <Check className="size-3 flex-shrink-0" />
          ) : (
            <Copy className="size-3 flex-shrink-0" />
          )}
          <span className="truncate">{isCopied ? 'Copied' : 'Copy page'}</span>
        </button>

        {/* Divider */}
        <div className="w-px bg-fd-border" />

        {/* Right side - Dropdown toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className={cn(
            "inline-flex items-center px-1.5 py-1 rounded-r-md flex-shrink-0",
            "hover:bg-fd-accent hover:text-fd-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-2",
            "disabled:opacity-50 disabled:pointer-events-none",
            "transition-colors"
          )}
        >
          <ChevronDown className={cn("size-3 transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-40 z-20 rounded-md border border-fd-border bg-fd-popover shadow-lg">
            <div className="p-1">
              <button
                onClick={handleViewMarkdown}
                disabled={isLoading}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-fd-accent hover:text-fd-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
              >
                <Eye className="size-3" />
                View as markdown
              </button>
              
              <button
                onClick={handleOpenInChatGPT}
                disabled={isLoading}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-fd-accent hover:text-fd-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
              >
                <ExternalLink className="size-3" />
                Open in ChatGPT
              </button>
              
              <button
                onClick={handleOpenInClaude}
                disabled={isLoading}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-fd-accent hover:text-fd-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
              >
                <ExternalLink className="size-3" />
                Open in Claude
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}