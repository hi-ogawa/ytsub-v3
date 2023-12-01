import { NavLink } from "@remix-run/react";
import { PopoverSimple } from "../../../components/popover";
import { DeckTable } from "../../../db/models";
import { $R } from "../../../misc/routes";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import { cls } from "../../../utils/misc";
import { LoaderData } from "./index.server";

export function DeckNavBarMenuComponent() {
  const { deck } = useLeafLoaderData() as LoaderData;
  return <DeckMenuComponent deck={deck} />;
}

export function DeckMenuComponent({ deck }: { deck: DeckTable }) {
  const items = [
    {
      to: $R["/decks/$id/practice"](deck),
      children: (
        <>
          <span className="i-ri-play-line w-6 h-6"></span>
          Practice
        </>
      ),
    },
    {
      to: $R["/decks/$id/history"](deck),
      children: (
        <>
          <span className="i-ri-history-line w-6 h-6"></span>
          History
        </>
      ),
    },
    {
      to: $R["/decks/$id/history-graph"](deck),
      children: (
        <>
          <span className="i-ri-bar-chart-line w-6 h-6"></span>
          Chart
        </>
      ),
    },
    {
      to: $R["/decks/$id"](deck),
      children: (
        <>
          <span className="i-ri-book-line w-6 h-6"></span>
          Deck
        </>
      ),
    },
    {
      to: $R["/decks/$id/edit"](deck),
      children: (
        <>
          <span className="i-ri-edit-line w-6 h-6"></span>
          Edit
        </>
      ),
    },
  ];

  return (
    <PopoverSimple
      placement="bottom-end"
      reference={
        <button
          className="antd-btn antd-btn-ghost i-ri-more-2-line w-6 h-6"
          data-test="deck-menu-popover-reference"
        />
      }
      floating={(context) => (
        <ul
          className="flex flex-col gap-2 p-2 w-[180px] text-sm"
          data-test="deck-menu-popover-floating"
        >
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                className={({ isActive }) =>
                  cls(
                    "w-full antd-menu-item flex items-center gap-2 p-2",
                    isActive && "antd-menu-item-active"
                  )
                }
                end
                onClick={() => context.onOpenChange(false)}
                {...item}
              />
            </li>
          ))}
        </ul>
      )}
    />
  );
}
