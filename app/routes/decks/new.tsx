import { Form, useActionData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { z } from "zod";
import { useSnackbar } from "../../components/snackbar";
import { Q } from "../../db/models";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useIsFormValid } from "../../utils/hooks";
import { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: "New Deck",
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

const REQUEST_SCHEMA = z.object({
  name: z.string().nonempty(),
});

interface ActionData {
  message: string;
}

export const action = makeLoader(Controller, async function () {
  const user = await this.requireUser();

  const parsed = REQUEST_SCHEMA.safeParse(await this.form());
  if (!parsed.success) {
    return { message: "invalid request" } as ActionData;
  }

  const { name } = parsed.data;
  const [id] = await Q.decks().insert({
    name,
    userId: user.id,
  });
  return redirect(R["/decks/$id"](id));
});

//
// component
//

export default function DefaultComponent() {
  const actionData = useActionData<ActionData>();
  const { enqueueSnackbar } = useSnackbar();
  const [isValid, formProps] = useIsFormValid();

  React.useEffect(() => {
    if (actionData?.message) {
      enqueueSnackbar(actionData?.message, { variant: "error" });
    }
  }, [actionData]);

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
            required
          />
        </div>
        <div className="form-control">
          <button type="submit" className="btn" disabled={!isValid}>
            Create
          </button>
        </div>
      </Form>
    </div>
  );
}
