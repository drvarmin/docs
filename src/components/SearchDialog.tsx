'use client';

// modified copy of fumadocs search dialog

import {
  FileText,
  Hash,
  Loader2 as LoaderCircle,
  Search as SearchIcon,
  Sparkles,
  CornerDownLeft,
  Text,
  Filter,
  RotateCcw,
} from 'lucide-react';
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { cn } from 'fumadocs-ui/utils/cn';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';

import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
} from '@radix-ui/react-dialog';
import type { SortedResult } from 'fumadocs-core/server';
import { cva } from 'class-variance-authority';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import { createContext } from 'fumadocs-core/framework';
import { useRouter, usePathname } from 'next/navigation';
import { useDocsSearch } from 'fumadocs-core/search/client';

export type SearchLink = [name: string, href: string];

type ReactSortedResult = Omit<SortedResult, 'content'> & {
  external?: boolean;
  content: ReactNode;
  tag?: string;
};

export interface TagItem {
  name: string;
  value: string;
}

export interface SharedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /**
   * Custom links to be displayed if search is empty
   */
  links?: SearchLink[];
}

interface SearchDialogProps extends SharedProps {
  search: string;
  onSearchChange: (v: string) => void;
  isLoading?: boolean;
  hideResults?: boolean;
  results: ReactSortedResult[] | 'empty';
  enabledTags?: string[];
  availableTags?: { id: string; label: string }[];
  onToggleTag?: (tagId: string) => void;

  footer?: ReactNode;
}

export function SearchDialogWrapper(props: SharedProps) {
  const { search, setSearch, query } = useDocsSearch({ 
    type: 'fetch', 
    api: '/docs/api/search'
  });
  
  return (
    <SearchDialog
      {...props}
      search={search}
      onSearchChange={setSearch}
      results={query.data ?? 'empty'}
      isLoading={query.isLoading}
    />
  );
}

// Add new type for AI prompt
interface AIPrompt {
  type: 'ai-prompt';
  id: 'ai-prompt';
  content: string;
}


export function SearchDialog({
  open,
  onOpenChange,
  footer,
  links = [],
  search: propSearch,
  onSearchChange: propOnSearchChange,
  isLoading: propIsLoading,
  results: propResults,
}: SearchDialogProps) {
  const { text } = useI18n();
  const [active, setActive] = useState<string>();
  const [showFilters, setShowFilters] = useLocalStorage('search-show-filters', false);
  const pathname = usePathname();
  
  // Tag filter state with local storage (excluding 'general')
  const [enabledTags, setEnabledTags] = useLocalStorage<string[]>('search-enabled-tags', ['ios', 'android', 'flutter', 'expo', 'dashboard']);
  
  // Track explicitly active tags (vs implicitly active = all enabled)
  const [explicitlyActiveTags, setExplicitlyActiveTags] = useLocalStorage<string[]>('search-explicitly-active-tags', []);
  
  // Available tags (excluding 'general')
  const availableTags = [
    { id: 'ios', label: 'iOS' },
    { id: 'android', label: 'Android' },
    { id: 'flutter', label: 'Flutter' },
    { id: 'expo', label: 'Expo' },
    { id: 'dashboard', label: 'Dashboard' },
  ];
  
  // Toggle tag filter with explicit/implicit state tracking
  const toggleTag = (tagId: string) => {
    setEnabledTags(prev => {
      // If all tags are enabled (implicitly active), select only this tag
      if (prev.length === availableTags.length && explicitlyActiveTags.length === 0) {
        setExplicitlyActiveTags([tagId]);
        return [tagId];
      }
      // If this tag is explicitly active and it's the only one, reset to all
      if (prev.length === 1 && prev.includes(tagId) && explicitlyActiveTags.includes(tagId)) {
        setExplicitlyActiveTags([]);
        return availableTags.map(tag => tag.id);
      }
      // Otherwise toggle normally and update explicit state
      const newEnabled = prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      
      // Update explicitly active tags
      if (newEnabled.includes(tagId)) {
        setExplicitlyActiveTags(prevExplicit => 
          prevExplicit.includes(tagId) ? prevExplicit : [...prevExplicit, tagId]
        );
      } else {
        setExplicitlyActiveTags(prevExplicit => prevExplicit.filter(id => id !== tagId));
      }
      
      return newEnabled;
    });
  };
  
  // Reset all filters
  const resetFilters = () => {
    setEnabledTags(availableTags.map(tag => tag.id));
    setExplicitlyActiveTags([]);
  };
  
  // Check if any filters are explicitly active
  const hasExplicitlyActiveFilters = explicitlyActiveTags.length > 0;
  
  // Check if any filters are active (not all enabled or has explicit filters)
  const hasActiveFilters = enabledTags.length < availableTags.length || hasExplicitlyActiveFilters;
  
  // Extract current SDK root from pathname - recalculate when dialog opens
  const currentRoot = useMemo(() => {
    if (!open) return 'general'; // Don't calculate when closed
    const parts = pathname.split('/').filter(Boolean);
    const knownRoots = ['dashboard', 'ios', 'android', 'expo', 'flutter'];
    const firstPart = parts[0] || 'general';
    const root = knownRoots.includes(firstPart) ? firstPart : 'general';
    return root;
  }, [pathname, open]);

  // Add default search functionality
  const { search: defaultSearch, setSearch: defaultSetSearch, query } = useDocsSearch({ type: 'fetch', api: '/docs/api/search' });
  
  // Use provided values or defaults
  const search = propSearch ?? defaultSearch;
  const onSearchChange = propOnSearchChange ?? defaultSetSearch;
  const isLoading = propIsLoading ?? query.isLoading;
  const results = propResults ?? (query.data ?? 'empty');

  // Debounced search loading indicator
  const [showSearchLoading, setShowSearchLoading] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const t = setTimeout(() => setShowSearchLoading(true), 200);
      return () => clearTimeout(t);
    }
    setShowSearchLoading(false);
  }, [isLoading]);

  // Default links if none provided
  const defaultLinks: SearchLink[] = [
    ['Welcome', '/docs'],
    ['SDK Installation', '/docs/sdk-installation/installation-overview'],
    ['Dashboard', '/docs/overview-metrics'],
    ['Web Checkout', '/docs/web-checkout-overview'],
  ];

  const displayLinks = links.length > 0 ? links : defaultLinks;

  // Client-side tagging and filtering
  const taggedAndFilteredResults = useMemo(() => {
    if (!results || results === 'empty') return results;
    
    // Add tags to results based on URL
    const taggedResults = results.map(item => {
      const url = (item as ReactSortedResult).url || '';
      const urlParts = url.split('/').filter(Boolean);
      const knownRoots = ['dashboard', 'ios', 'android', 'expo', 'flutter'];
      const firstPart = urlParts[0] || 'general';
      const tag = knownRoots.includes(firstPart) ? firstPart : 'general';
      
      return {
        ...item,
        tag
      } as ReactSortedResult;
    });
    
    // Filter by enabled tags - include general when all tags are enabled
    const filteredResults = taggedResults.filter(item => {
      const itemTag = item.tag || 'general';
      if (itemTag === 'general') {
        // Include general only when all non-general tags are enabled (reset state)
        return enabledTags.length === availableTags.length && explicitlyActiveTags.length === 0;
      }
      return enabledTags.includes(itemTag);
    });
    
    // Sort by priority
    const sdkRoots = ['ios', 'android', 'flutter', 'expo'];
    
    return filteredResults.sort((a, b) => {
      const aTag = a.tag || 'general';
      const bTag = b.tag || 'general';
      
      // Priority 1: Current root folder
      if (aTag === currentRoot && bTag !== currentRoot) return -1;
      if (bTag === currentRoot && aTag !== currentRoot) return 1;
      
      // Priority 2: Other root folders (non-SDK)
      const aIsSDK = sdkRoots.includes(aTag);
      const bIsSDK = sdkRoots.includes(bTag);
      
      if (!aIsSDK && bIsSDK) return -1;
      if (!bIsSDK && aIsSDK) return 1;
      
      // Priority 3: Other SDK root folders
      return 0;
    });
  }, [results, enabledTags, currentRoot]);

  // Add AI prompt to the items list
  const allItems = useMemo(() => {
    const items = taggedAndFilteredResults === 'empty' 
      ? displayLinks.map(([name, link]) => ({
          type: 'page' as const,
          id: name,
          content: name,
          url: link,
        }))
      : taggedAndFilteredResults;

    // Show the AI prompt at the top
    const aiPrompt: AIPrompt = {
      type: 'ai-prompt',
      id: 'ai-prompt',
      content: 'Ask AI',
    };
    return [aiPrompt, ...items];
  }, [results, displayLinks]);

  // Handle AI redirect to AI page
  const { push } = useRouter();
  const handleAiSearch = () => {
    if (!search.trim()) return;
    
    const encodedQuery = encodeURIComponent(search.trim());
    onOpenChange(false); // Close search dialog
    push(`/ai?search=${encodedQuery}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=closed]:animate-fd-fade-out data-[state=open]:animate-fd-fade-in" />
      <DialogContent
        aria-describedby={undefined}
        className="fixed left-1/2 top-[10vh] z-50 w-[98vw] max-w-screen-sm max-h-[80vh] -translate-x-1/2 rounded-lg border bg-fd-popover text-fd-popover-foreground shadow-lg overflow-y-auto data-[state=closed]:animate-fd-dialog-out data-[state=open]:animate-fd-dialog-in"
      >
        <DialogTitle className="hidden">{text.search}</DialogTitle>
        <div className="flex flex-row items-center gap-2 px-3">
          <LoadingIndicator isLoading={showSearchLoading} />
          <input
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setActive(undefined);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (active === 'ai-prompt') {
                  handleAiSearch();
                }
              }
            }}
            placeholder={text.search}
            className="w-0 flex-1 bg-transparent py-3 text-base placeholder:text-fd-muted-foreground focus-visible:outline-none"
          />
          <button
            type="button"
            aria-label="Toggle Filters"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 border border-fd-border rounded transition-colors cursor-pointer ${
              hasActiveFilters
                ? 'bg-[#74F8F0]/20 text-[#74F8F0] border-[#74F8F0]/30'
                : showFilters
                ? 'bg-fd-accent text-fd-accent-foreground'
                : 'bg-fd-background hover:bg-fd-accent'
            }`}
          >
            <Filter className="size-3" />
          </button>
          <button
            type="button"
            aria-label="Close Search"
            onClick={() => onOpenChange(false)}
            className="text-xs p-1.5 border border-fd-border rounded bg-fd-background hover:bg-fd-accent cursor-pointer"
          >
            Esc
          </button>
        </div>
        
        {/* Tag Filters */}
        {showFilters && (
          <>
            <div className="border-t" />
            <div className="px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {availableTags.map(tag => {
                    const isEnabled = enabledTags.includes(tag.id);
                    const isExplicitlyActive = explicitlyActiveTags.includes(tag.id);
                    const isImplicitlyActive = isEnabled && !hasExplicitlyActiveFilters;
                    
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer border ${
                          isExplicitlyActive
                            ? 'bg-[#74F8F0]/20 text-[#74F8F0] border-[#74F8F0]/30'
                            : isImplicitlyActive
                            ? 'bg-fd-accent text-fd-accent-foreground border-transparent'
                            : 'bg-fd-muted text-fd-muted-foreground hover:bg-fd-accent/50 border-transparent'
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={!hasExplicitlyActiveFilters}
                  className={`p-1 rounded transition-colors ${
                    hasExplicitlyActiveFilters
                      ? 'text-fd-muted-foreground hover:text-fd-foreground cursor-pointer'
                      : 'text-fd-muted-foreground/50 cursor-not-allowed'
                  }`}
                  aria-label="Reset filters"
                >
                  <RotateCcw className="size-3" />
                </button>
              </div>
            </div>
          </>
        )}
        {allItems.length > 0 ? (
          <SearchResults
            active={active}
            onActiveChange={setActive}
            items={allItems}
            onSelect={() => onOpenChange(false)}
            onAiSearch={handleAiSearch}
          />
        ) : null}
        <div className="mt-auto flex flex-col border-t p-3 empty:hidden">
          {footer}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const icons = {
  text: <Text className="size-4 text-fd-muted-foreground" />,
  heading: <Hash className="size-4 text-fd-muted-foreground" />,
  page: <FileText className="size-4 text-fd-muted-foreground" />,
};

function SearchResults({
  items = [],
  active = items[0]?.id,
  onActiveChange,
  onSelect,
  onAiSearch,
  ...props
}: ComponentProps<'div'> & {
  active?: string;
  onActiveChange: (active: string | undefined) => void;
  items: (ReactSortedResult | AIPrompt)[];
  onSelect?: (value: string) => void;
  onAiSearch: () => void;
}) {
  const { text } = useI18n();
  const router = useRouter();
  const sidebar = useSidebar();

  const onOpen = ({ external, url }: ReactSortedResult) => {
    if (external) window.open(url, '_blank')?.focus();
    else router.push(url);
    onSelect?.(url);
    sidebar.setOpen(false);
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key == 'ArrowUp') {
      const idx = items.findIndex((item) => item.id === active);
      if (idx === -1) {
        onActiveChange(items[0]?.id);
      } else {
        onActiveChange(
          items[((e.key === 'ArrowDown' ? idx + 1 : idx - 1) % items.length)]
            ?.id,
        );
      }

      e.preventDefault();
    }

    if (e.key === 'Enter') {
      const selected = items.find((item) => item.id === active);
      
      if (selected) {
        if (selected.type === 'ai-prompt') {
          onAiSearch();
        } else {
          onOpen(selected as ReactSortedResult);
        }
      }
      e.preventDefault();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onKey]);

  return (
    <div
      {...props}
      className={cn(
        'flex flex-1 overflow-y-auto flex-col border-t p-2',
        props.className,
      )}
    >
      {items.length === 0 ? (
        <div className="py-12 text-center text-sm">{text.searchNoResult}</div>
      ) : null}

      {items.map((item) => {
        if (item.type === 'ai-prompt') {
          return (
            <CommandItem
              key={item.id}
              active={active === item.id}
              onPointerMove={() => onActiveChange(item.id)}
              onClick={() => onAiSearch()}
            >
              <Sparkles
                className={
                  active === item.id
                    ? 'size-4 text-[#74F8F0]'
                    : 'size-4 text-fd-muted-foreground'
                }
              />
              <p className="font-medium">Ask AI</p>
              {active === item.id && (
                <CornerDownLeft className="size-3 text-fd-muted-foreground ml-auto" />
              )}
            </CommandItem>
          );
        }

        const resultItem = item as ReactSortedResult;
        const rootFolder = resultItem.tag || 'general';
        
        // Format root folder name for display
        const formatRootFolder = (folder: string) => {
          switch (folder) {
            case 'ios': return 'iOS';
            case 'android': return 'Android';
            case 'flutter': return 'Flutter';
            case 'expo': return 'Expo';
            case 'dashboard': return 'Dashboard';
            case 'general': return 'General';
            default: return folder.charAt(0).toUpperCase() + folder.slice(1);
          }
        };

        return (
          <CommandItem
            key={item.id}
            active={active === item.id}
            onPointerMove={() => onActiveChange(item.id)}
            onClick={() => onOpen(item as ReactSortedResult)}
          >
            {item.type !== 'page' ? (
              <div
                role="none"
                className="ms-2 h-full min-h-10 w-px bg-fd-border"
              />
            ) : null}
            {icons[item.type]}
            <div className="flex-1 min-w-0">
              <p className="truncate">{item.content}</p>
            </div>
            {/* Only show tag on page results, not headers or content, and not for general */}
            {item.type === 'page' && rootFolder !== 'general' && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-fd-accent text-fd-accent-foreground">
                  {formatRootFolder(rootFolder)}
                </span>
              </div>
            )}
            {active === item.id && (
              <CornerDownLeft className="size-3 text-fd-muted-foreground ml-1" />
            )}
          </CommandItem>
        );
      })}
    </div>
  );
}

function LoadingIndicator({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="relative size-4">
      <LoaderCircle
        className={cn(
          'absolute size-full animate-spin text-fd-primary transition-opacity',
          !isLoading && 'opacity-0',
        )}
      />
      <SearchIcon
        className={cn(
          'absolute size-full text-fd-muted-foreground transition-opacity',
          isLoading && 'opacity-0',
        )}
      />
    </div>
  );
}

function CommandItem({
  active = false,
  ...props
}: ComponentProps<'button'> & {
  active?: boolean;
}) {
  return (
    <button
      ref={useCallback(
        (element: HTMLButtonElement | null) => {
          if (active && element) {
            element.scrollIntoView({
              block: 'nearest',
            });
          }
        },
        [active],
      )}
      type="button"
      aria-selected={active}
      {...props}
      className={cn(
        'flex min-h-10 select-none cursor-pointer flex-row items-center gap-2.5 rounded-lg px-2 text-start text-sm',
        active && 'bg-fd-accent text-fd-accent-foreground',
        props.className,
      )}
    >
      {props.children}
    </button>
  );
}

export interface TagsListProps extends ComponentProps<'div'> {
  tag?: string;
  onTagChange: (tag: string | undefined) => void;
  allowClear?: boolean;
}

const itemVariants = cva(
  'rounded-md border px-2 py-0.5 text-xs font-medium text-fd-muted-foreground transition-colors',
  {
    variants: {
      active: {
        true: 'bg-fd-accent text-fd-accent-foreground',
      },
    },
  },
);

const TagsListContext = createContext<{
  value?: string;
  onValueChange: (value: string | undefined) => void;
  allowClear: boolean;
}>('TagsList');

export function TagsList({
  tag,
  onTagChange,
  allowClear = false,
  ...props
}: TagsListProps) {
  return (
    <div
      {...props}
      className={cn('flex items-center gap-1 flex-wrap', props.className)}
    >
      <TagsListContext.Provider
        value={useMemo(
          () => ({
            value: tag,
            onValueChange: onTagChange,
            allowClear,
          }),
          [allowClear, onTagChange, tag],
        )}
      >
        {props.children}
      </TagsListContext.Provider>
    </div>
  );
}

export function TagsListItem({
  value,
  className,
  ...props
}: ComponentProps<'button'> & {
  value: string;
}) {
  const ctx = TagsListContext.use();

  return (
    <button
      type="button"
      data-active={value === ctx.value}
      className={cn(itemVariants({ active: value === ctx.value, className }))}
      onClick={() => {
        ctx.onValueChange(
          ctx.value === value && ctx.allowClear ? undefined : value,
        );
      }}
      tabIndex={-1}
      {...props}
    >
      {props.children}
    </button>
  );
}

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      color: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      color: 'default',
    },
  }
);