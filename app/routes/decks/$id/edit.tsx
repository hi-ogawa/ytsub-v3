import { DeckNavBarMenuComponent, requireUserAndDeck } from ".";
import { Form, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { z } from "zod";
import { DeckTable, Q } from "../../../db/models";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { toastInfo } from "../../../utils/flash-message-hook";
import { useDeserialize, useIsFormValid } from "../../../utils/hooks";
import { dtf } from "../../../utils/intl";
import type { PageHandle } from "../../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Edit Deck",
  navBarMenu: () => <DeckNavBarMenuComponent />,
};

//
// loader
//

interface LoaderData {
  deck: DeckTable;
}

export const loader = makeLoader(Controller, async function () {
  const [, deck] = await requireUserAndDeck.apply(this);
  const data: LoaderData = { deck };
  return this.serialize(data);
});

//
// action
//

const EDIT_DECK_REQUEST_SCHEMA = z.object({
  name: z.string().nonempty(),
  newEntriesPerDay: z.coerce.number().int(),
  reviewsPerDay: z.coerce.number().int(),
  // TODO: support same option on "/decks/new" page
  randomMode: z
    .string()
    .optional()
    .transform((s) => s === "on"),
});

export const action = makeLoader(Controller, async function () {
  const [, deck] = await requireUserAndDeck.apply(this);

  const parsed = EDIT_DECK_REQUEST_SCHEMA.safeParse(await this.form());
  if (!parsed.success) {
    this.flash({ content: "invalid request", variant: "error" });
    return null;
  }

  await Q.decks().update(parsed.data).where("id", deck.id);
  this.flash({ content: "Deck updated successfully", variant: "success" });
  return redirect(R["/decks/$id"](deck.id));
});

//
// component
//

export default function DefaultComponent() {
  return (
    <div className="w-full flex justify-center p-4">
      <DefaultComponentInner />
    </div>
  );
}

function DefaultComponentInner() {
  const { deck }: LoaderData = useDeserialize(useLoaderData());
  const [isValid, formProps] = useIsFormValid();

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-4">
      <Form
        method="post"
        className="flex flex-col border w-full p-6 gap-3"
        data-test="edit-deck-form"
        {...formProps}
      >
        <h1 className="text-lg">Edit Deck</h1>
        <label className="flex flex-col gap-1">
          <span className="text-colorTextLabel">Name</span>
          <input
            type="text"
            name="name"
            className="antd-input p-1"
            defaultValue={deck.name}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-colorTextLabel">New entries per day</span>
          <input
            type="number"
            name="newEntriesPerDay"
            className="antd-input p-1"
            defaultValue={deck.newEntriesPerDay}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-colorTextLabel">Reviews per day</span>
          <input
            type="number"
            name="reviewsPerDay"
            className="antd-input p-1"
            defaultValue={deck.reviewsPerDay}
            required
          />
        </label>
        <label className="flex gap-2">
          <span className="text-colorTextLabel">Randomize</span>
          <input
            type="checkbox"
            name="randomMode"
            defaultChecked={deck.randomMode}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-colorTextLabel">Created At</span>
          <input
            className="antd-input p-1"
            readOnly
            disabled
            value={dtf.format(deck.createdAt)}
          />
        </label>
        <button
          type="submit"
          className="antd-btn antd-btn-primary p-1"
          disabled={!isValid}
        >
          Save
        </button>
      </Form>
      <div className="flex flex-col border w-full p-6 gap-3">
        <h1 className="text-lg">Others</h1>
        <a
          className="antd-btn antd-btn-default p-1 grid place-content-center"
          href={R["/decks/$id/export"](deck.id)}
          // avoid `json` since it cannot be attached on github editor https://github.com/isaacs/github/issues/1130
          download={`ytsub-deck-export--${deck.name}.txt`}
        >
          Export JSON
        </a>
      </div>
      <div className="flex flex-col border w-full p-6 gap-3 border-colorErrorBorder">
        <h1 className="text-lg">Danger Zone</h1>
        <Form
          className="flex"
          action={R["/decks/$id?index"](deck.id)}
          method="delete"
          onSubmitCapture={(e) => {
            const message = `Are you sure? Please type '${deck.name}' to delete this deck.`;
            const response = window.prompt(message);
            if (response !== deck.name) {
              e.preventDefault();
              toastInfo("Deletion canceled");
            }
          }}
        >
          <button
            type="submit"
            className="w-full antd-btn antd-btn-default p-1"
          >
            Delete this deck
          </button>
        </Form>
      </div>
    </div>
  );
}
