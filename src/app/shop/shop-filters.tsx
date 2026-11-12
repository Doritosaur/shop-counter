"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { parseSort, shopHref, SORT_OPTIONS, type SortKey } from "@/lib/shop-query";
import * as ui from "@/app/ui";

const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  q: string;
  sort: SortKey;
  /** Typing keeps `?sort=` only if it was already in the URL. */
  sortInUrl: boolean;
};

/**
 * Search pushes once typing pauses, so each burst is one history entry and
 * Back returns to the previous filter. Pushing on the first key and replacing
 * on the rest races: the replace can overwrite the previous entry.
 *
 * The inputs adopt the URL whenever it changes for any reason other than our
 * own pushes (Back, Forward, a link to /shop). Our pushes are tracked until
 * the server renders them, so a slow `lamp` cannot overwrite a typed `lamps`.
 */
export function ShopFilters({ q, sort, sortInUrl }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(q);
  const [sortValue, setSortValue] = useState<SortKey>(sort);
  const [keepSort, setKeepSort] = useState(sortInUrl);
  const pendingSearch = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchId = useId();
  const sortId = useId();

  const urlHref = shopHref({ q, sort: sortInUrl ? sort : null });
  const [seenHref, setSeenHref] = useState(urlHref);
  const [inFlight, setInFlight] = useState<string[]>([]);
  const [externalNavs, setExternalNavs] = useState(0);

  if (urlHref !== seenHref) {
    setSeenHref(urlHref);
    if (inFlight.includes(urlHref)) {
      if (inFlight.at(-1) === urlHref) setInFlight([]);
    } else {
      setQuery(q);
      setSortValue(sort);
      setKeepSort(sortInUrl);
      setInFlight([]);
      setExternalNavs((n) => n + 1);
    }
  }

  function cancelPendingSearch() {
    if (pendingSearch.current) clearTimeout(pendingSearch.current);
    pendingSearch.current = null;
  }

  // Someone else navigated: drop a search the user had not finished typing.
  useEffect(() => cancelPendingSearch, [externalNavs]);

  function push(href: string) {
    setInFlight((hrefs) => [...hrefs, href]);
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  function searchHref(value: string) {
    return shopHref({ q: value, sort: keepSort ? sortValue : null });
  }

  function onSearchChange(value: string) {
    setQuery(value);
    cancelPendingSearch();
    pendingSearch.current = setTimeout(() => {
      pendingSearch.current = null;
      push(searchHref(value));
    }, SEARCH_DEBOUNCE_MS);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingSearch.current) return;
    cancelPendingSearch();
    push(searchHref(query));
  }

  function onSortChange(value: string) {
    const next = parseSort(value);
    setSortValue(next);
    setKeepSort(true);
    cancelPendingSearch();
    push(shopHref({ q: query, sort: next }));
  }

  return (
    <form
      role="search"
      action="/shop"
      method="get"
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <label htmlFor={searchId} className={ui.label}>
          Search
        </label>
        <input
          id={searchId}
          name="q"
          type="search"
          value={query}
          onChange={(event) => onSearchChange(event.target.value)}
          className={ui.input}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={sortId} className={ui.label}>
          Sort
        </label>
        <select
          id={sortId}
          name="sort"
          value={sortValue}
          onChange={(event) => onSortChange(event.target.value)}
          className={ui.input}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
