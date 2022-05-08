import { Form, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { z } from "zod";
import { DeckTable, Q } from "../../../db/models";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize, useIsFormValid } from "../../../utils/hooks";
import { dtf } from "../../../utils/intl";
import { PageHandle } from "../../../utils/page-handle";
import { zStringToInteger } from "../../../utils/zod-utils";
import { requireUserAndDeck } from ".";

export const handle: PageHandle = {
  navBarTitle: () => "Edit Deck",
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
  console.log(data);
  return this.serialize(data);
});

//
// action
//

const EDIT_DECK_REQUEST_SCHEMA = z.object({
  name: z.string().nonempty(),
  newEntriesPerDay: zStringToInteger,
  reviewsPerDay: zStringToInteger,
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
  const { deck }: LoaderData = useDeserialize(useLoaderData());
  const [isValid, formProps] = useIsFormValid();

  return (
    <div className="w-full p-4 flex justify-center">
      <Form
        method="post"
        className="card border w-80 p-4 px-6 gap-2"
        data-test="edit-deck-form"
        {...formProps}
      >
        <div className="form-control mb-2">
          <label className="label">
            <span className="label-text">Name</span>
          </label>
          <input
            type="text"
            name="name"
            className="input input-bordered"
            defaultValue={deck.name}
            required
          />
        </div>
        <div className="form-control mb-2">
          <label className="label">
            <span className="label-text">New entries per day</span>
          </label>
          <input
            type="number"
            name="newEntriesPerDay"
            className="input input-bordered"
            defaultValue={deck.newEntriesPerDay}
            required
          />
        </div>
        <div className="form-control mb-2">
          <label className="label">
            <span className="label-text">Reviews per day</span>
          </label>
          <input
            type="number"
            name="reviewsPerDay"
            className="input input-bordered"
            defaultValue={deck.reviewsPerDay}
            required
          />
        </div>
        <div className="form-control mb-1.5">
          <label className="label cursor-pointer">
            <span className="label-text">Randomize</span>
            <input
              type="checkbox"
              name="randomMode"
              className="toggle"
              defaultChecked={deck.randomMode}
            />
          </label>
        </div>
        <div className="form-control mb-2">
          <label className="label">
            <span className="label-text">Created At</span>
          </label>
          <input
            className="input input-bordered bg-gray-100"
            readOnly
            value={dtf.format(deck.createdAt)}
          />
        </div>
        <div className="form-control">
          <button type="submit" className="btn" disabled={!isValid}>
            Save
          </button>
        </div>
      </Form>
    </div>
  );
}
