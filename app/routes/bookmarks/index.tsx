import { useTinyForm } from "@hiogawa/tiny-form/dist/react";
import { Transition } from "@hiogawa/tiny-transition/dist/react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { transitionProps } from "#components/misc";
import { PopoverSimple } from "#components/popover";
import { ROUTE_DEF } from "#misc/routes";
import {
  BookmarkEntryComponent,
  BookmarksMenuItems,
} from "#routes/bookmarks/_ui";
import { rpcClientQuery } from "#trpc/client";
import {
  disableUrlQueryRevalidation,
  useUrlQuerySchema,
} from "#utils/loader-utils";
import { cls } from "#utils/misc";
import type { PageHandle } from "#utils/page-handle";

export { loader } from "./index.server";

export const shouldRevalidate = disableUrlQueryRevalidation;

export const handle: PageHandle = {
  navBarTitle: () => "Bookmarks",
  navBarMenu: () => <NavBarMenuComponent />,
};

export default function DefaultComponent() {
  const [urlQuery, setUrlQuery] = useUrlQuerySchema(
    ROUTE_DEF["/bookmarks"].query
  );
  const form = useTinyForm({ q: urlQuery.q ?? "" });

  const bookmarkEntriesQuery = useInfiniteQuery({
    ...rpcClientQuery.bookmarks_index.infiniteQueryOptions((context) => ({
      q: urlQuery.q,
      cursor: context?.pageParam as any,
    })),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    placeholderData: keepPreviousData,
  });
  const rows = bookmarkEntriesQuery.data?.pages.flatMap((page) => page.rows);

  return (
    <>
      <div className="w-full flex justify-center">
        <div className="h-full w-full max-w-lg">
          <div className="h-full flex flex-col p-2 gap-2 relative">
            <div className="flex py-1">
              <form
                onSubmit={form.handleSubmit(() =>
                  setUrlQuery({ q: form.data.q || undefined })
                )}
              >
                <label className="relative flex items-center">
                  <span className="absolute text-colorTextSecondary ml-2 i-ri-search-line w-4 h-4"></span>
                  <input
                    className="antd-input pl-7 py-0.5"
                    type="text"
                    placeholder="Search text..."
                    {...form.fields.q.props()}
                  />
                </label>
              </form>
            </div>
            {rows?.map((row) => (
              <BookmarkEntryComponent
                key={row.bookmarkEntries.id}
                video={row.videos}
                captionEntry={row.captionEntries}
                bookmarkEntry={row.bookmarkEntries}
                showAutoplay
              />
            ))}
            {bookmarkEntriesQuery.hasNextPage && (
              <button
                className={cls(
                  "antd-btn antd-btn-default p-1 text-sm",
                  bookmarkEntriesQuery.isFetchingNextPage && "antd-btn-loading"
                )}
                onClick={() => bookmarkEntriesQuery.fetchNextPage()}
              >
                Load more
              </button>
            )}
            <Transition
              show={
                bookmarkEntriesQuery.isLoading ||
                bookmarkEntriesQuery.isPlaceholderData
              }
              className="absolute inset-0 duration-500 antd-body"
              {...transitionProps("opacity-0", "opacity-50")}
            >
              <div className="mx-auto mt-[200px] antd-spin h-18"></div>
            </Transition>
          </div>
        </div>
      </div>
    </>
  );
}

//
// NavBarMenuComponent
//

function NavBarMenuComponent() {
  return (
    <>
      <div className="flex items-center">
        <PopoverSimple
          placement="bottom-end"
          reference={
            <button
              className={cls(
                "antd-btn antd-btn-ghost i-ri-more-2-line w-6 h-6"
              )}
            />
          }
          floating={(context) => (
            <ul className="flex flex-col gap-2 p-2 w-[160px] text-sm">
              <BookmarksMenuItems
                onClickItem={() => context.onOpenChange(false)}
              />
            </ul>
          )}
        />
      </div>
    </>
  );
}
