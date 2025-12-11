import { ComponentProps, ReactNode } from 'react';
import { cn } from 'fumadocs-ui/utils/cn';

type MessageProps = ComponentProps<'div'> & {
  from: 'user' | 'assistant';
  children: ReactNode;
};

export function Message({ from, className, children, ...props }: MessageProps) {
  const isUser = from === 'user';

  return (
    <div
      className={cn('group flex w-full', isUser ? 'justify-end' : 'justify-start', className)}
      {...props}
    >
      <div
        className={cn(
          'max-w-[90%] text-sm text-fd-foreground',
        )}
      >
        {children}
      </div>
    </div>
  );
}

type MessageContentProps = ComponentProps<'div'> & {
  children: ReactNode;
};

export function MessageContent({ className, children, ...props }: MessageContentProps) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none break-words overflow-wrap-anywhere prose-p:my-0 prose-p:leading-relaxed',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type MessageResponseProps = ComponentProps<'div'> & {
  children: ReactNode;
};

export function MessageResponse({ className, children, ...props }: MessageResponseProps) {
  return (
    <div className={cn('leading-relaxed text-sm', className)} {...props}>
      {children}
    </div>
  );
}
