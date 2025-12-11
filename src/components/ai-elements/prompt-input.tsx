import { ComponentProps, ReactNode, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from 'fumadocs-ui/utils/cn';

type PromptInputProps = ComponentProps<'form'> & {
  children: ReactNode;
};

export function PromptInput({ className, children, ...props }: PromptInputProps) {
  return (
    <form
      className={cn(
        'relative flex flex-col gap-2 rounded-[var(--radius-lg)] border border-fd-border bg-fd-background p-3 shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </form>
  );
}

type PromptInputTextareaProps = ComponentProps<'textarea'>;

export const PromptInputTextarea = forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'min-h-[72px] w-full resize-none rounded-[var(--radius-md)] border border-fd-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-fd-primary',
          className,
        )}
        {...props}
      />
    );
  },
);

PromptInputTextarea.displayName = 'PromptInputTextarea';

type PromptInputFooterProps = ComponentProps<'div'> & { children: ReactNode };

export function PromptInputFooter({ className, children, ...props }: PromptInputFooterProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)} {...props}>
      {children}
    </div>
  );
}

type PromptInputSubmitProps = ComponentProps<'button'> & {
  status?: 'ready' | 'submitting' | 'streaming';
};

export function PromptInputSubmit({
  className,
  disabled,
  status = 'ready',
  children,
  ...props
}: PromptInputSubmitProps) {
  const isBusy = status === 'submitting' || status === 'streaming';

  return (
    <button
      type="submit"
      disabled={disabled || isBusy}
      className={cn(
        'inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-fd-primary px-3 py-2 text-sm font-medium text-fd-primary-foreground shadow-sm transition hover:bg-fd-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {isBusy && <Loader2 className="size-4 animate-spin" />}
      {children ?? (status === 'streaming' ? 'Stop' : 'Send')}
    </button>
  );
}

// Alias matching examples
export const Input = PromptInput;

