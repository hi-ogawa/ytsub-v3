import { Form, useActionData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import React from "react";
import toast from "react-hot-toast";
import { z } from "zod";
import { DeckTable, Q } from "../../db/models";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useIsFormValid } from "../../utils/hooks";
import type { PageHandle } from "../../utils/page-handle";
import { zStringToInteger } from "../../utils/zod-utils";

export const handle: PageHandle = {
  navBarTitle: () => "New Deck",
};

//
// loader
//

export const loader = makeLoader(Controller, async function () {
  await this.requireUser();
  return null;
});

//
// action
//

const DEFAULT_DECK_OPTIONS: Pick<
  DeckTable,
  "newEntriesPerDay" | "reviewsPerDay" | "easeMultiplier" | "easeBonus"
> = {
  newEntriesPerDay: 50,
  reviewsPerDay: 200,
  easeMultiplier: 2,
  easeBonus: 1.5,
};

const NEW_DECK_REQUEST_SCHEMA = z.object({
  name: z.string().nonempty(),
  newEntriesPerDay: zStringToInteger,
  reviewsPerDay: zStringToInteger,
  easeMultiplier: z.coerce
    .number()
    .default(DEFAULT_DECK_OPTIONS.easeMultiplier),
  easeBonus: z.coerce.number().default(DEFAULT_DECK_OPTIONS.easeBonus),
});

interface ActionData {
  message: string;
}

export const action = makeLoader(Controller, async function () {
  const user = await this.requireUser();

  const parsed = NEW_DECK_REQUEST_SCHEMA.safeParse(await this.form());
  if (!parsed.success) {
    return { message: "invalid request" } as ActionData;
  }

  const [id] = await Q.decks().insert({
    userId: user.id,
    ...parsed.data,
  });
  this.flash({ content: "Deck created successfully", variant: "success" });
  return redirect(R["/decks/$id"](id));
});

//
// component
//

export default function DefaultComponent() {
  const actionData = useActionData<ActionData>();
  const [isValid, formProps] = useIsFormValid();

  React.useEffect(() => {
    if (actionData?.message) {
      toast.error(actionData.message);
    }
  }, [actionData]);

  return (
    <div className="w-full p-4 flex justify-center">
      <Form
        method="post"
        className="flex flex-col border w-full max-w-sm p-4 px-6 gap-3"
        data-test="new-deck-form"
        {...formProps}
      >
        <h1 className="text-lg">New Deck</h1>
        <label className="flex flex-col gap-1">
          <span className="text-colorTextLabel">Name</span>
          <input type="text" name="name" className="antd-input p-1" required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-colorTextLabel">New entries per day</span>
          <input
            type="number"
            name="newEntriesPerDay"
            className="antd-input p-1"
            defaultValue={String(DEFAULT_DECK_OPTIONS.newEntriesPerDay)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-colorTextLabel">Reviews per day</span>
          <input
            type="number"
            name="reviewsPerDay"
            className="antd-input p-1"
            defaultValue={String(DEFAULT_DECK_OPTIONS.reviewsPerDay)}
            required
          />
        </label>
        <button
          type="submit"
          className="antd-btn antd-btn-primary p-1"
          disabled={!isValid}
        >
          Create
        </button>
      </Form>
    </div>
  );
}
