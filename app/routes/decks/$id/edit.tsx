import { Form, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { DeckTable, Q } from "../../../db/models";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize, useIsFormValid } from "../../../utils/hooks";
import { PageHandle } from "../../../utils/page-handle";
import { NEW_DECK_REQUEST_SCHEMA } from "../new";
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
  return this.serialize(data);
});

//
// action
//

export const action = makeLoader(Controller, async function () {
  const [, deck] = await requireUserAndDeck.apply(this);

  const parsed = NEW_DECK_REQUEST_SCHEMA.safeParse(await this.form());
  if (!parsed.success) {
    this.flash({ content: "invalid request", variant: "error" });
    return null;
  }

  await Q.decks().update(parsed.data).where("id", deck.id);
  this.flash({ content: "Updated successfuly", variant: "success" });
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
        data-test="new-deck-form"
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
        <div className="form-control">
          <button type="submit" className="btn" disabled={!isValid}>
            Save
          </button>
        </div>
      </Form>
    </div>
  );
}
