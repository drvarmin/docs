import { ComponentProps, ReactNode, RefObject, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from 'fumadocs-ui/utils/cn';

type ConversationProps = ComponentProps<'div'> & {
  children: ReactNode;
};

export function Conversation({ className, children, ...props }: ConversationProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)} {...props}>
      {children}
    </div>
  );
}

type ConversationContentProps = ComponentProps<'div'> & {
  children: ReactNode;
  contentRef?: RefObject<HTMLDivElement>;
};

export function ConversationContent({
  className,
  children,
  contentRef: forwardedRef,
  ...props
}: ConversationContentProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const contentRef = forwardedRef || internalRef;

  return (
    <div
      ref={contentRef}
      className={cn('flex flex-col gap-3 overflow-y-auto pr-1', className)}
      {...props}
    >
      {children}
    </div>
  );
}

type ConversationEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
};

export function ConversationEmptyState({ icon, title, description }: ConversationEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-fd-muted-foreground">
      {icon}
      <div className="text-base font-semibold text-fd-foreground">{title}</div>
      {description && <div className="text-sm text-fd-muted-foreground">{description}</div>}
    </div>
  );
}

type ScrollButtonProps = {
  target?: HTMLElement | null;
  visible?: boolean;
};

export function ConversationScrollButton({ target, visible = true }: ScrollButtonProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!target) {
      setShow(false);
      return;
    }

    const handleScroll = () => {
      if (!target) return;
      const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 120;
      setShow(!nearBottom);
    };

    handleScroll();
    target.addEventListener('scroll', handleScroll);
    return () => target.removeEventListener('scroll', handleScroll);
  }, [target]);

  if (!visible || !show) return null;

  return (
    <button
      type="button"
      onClick={() => {
        target?.scrollTo({ top: target.scrollHeight, behavior: 'smooth' });
      }}
      className="sticky bottom-2 self-end rounded-full border border-fd-border bg-fd-background/90 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur hover:bg-fd-accent"
    >
      <div className="flex items-center gap-1">
        <ChevronDown className="size-3" />
        <span>New messages</span>
      </div>
    </button>
  );
}

