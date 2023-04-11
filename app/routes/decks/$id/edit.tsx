import { DeckNavBarMenuComponent, requireUserAndDeck } from ".";
import { Form, useLoaderData } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import type { DeckTable } from "../../../db/models";
import { R } from "../../../misc/routes";
import { trpc } from "../../../trpc/client";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { toastInfo } from "../../../utils/flash-message-hook";
import { useDeserialize } from "../../../utils/hooks";
import { dtf } from "../../../utils/intl";
import { cls } from "../../../utils/misc";
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

  const form = useForm({ defaultValues: deck });

  const updateDeckMutation = useMutation({
    ...trpc.decks_update.mutationOptions(),
    onSuccess: () => {
      toast.success("Successfully updated a deck");
      form.reset(form.getValues());
    },
    onError: () => {
      toast.error("Failed to update a deck");
    },
  });

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-4">
      <form
        className="flex flex-col border w-full p-6 gap-3"
        data-test="edit-deck-form"
        onSubmit={form.handleSubmit((data) => updateDeckMutation.mutate(data))}
      >
        <h1 className="text-lg">Edit Deck</h1>
        <label className="flex flex-col gap-1">
          <span className="text-colorTextLabel">Name</span>
          <input
            type="text"
            className="antd-input p-1"
            {...form.register("name", { required: true })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-colorTextLabel">New entries per day</span>
          <input
            type="number"
            className="antd-input p-1"
            {...form.register("newEntriesPerDay", {
              required: true,
              valueAsNumber: true,
            })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-colorTextLabel">Reviews per day</span>
          <input
            type="number"
            className="antd-input p-1"
            {...form.register("reviewsPerDay", {
              required: true,
              valueAsNumber: true,
            })}
          />
        </label>
        <label className="flex gap-2">
          <span className="text-colorTextLabel">Randomize</span>
          <input type="checkbox" {...form.register("randomMode")} />
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
          className={cls(
            "antd-btn antd-btn-primary p-1",
            updateDeckMutation.isLoading && "antd-btn-loading"
          )}
          disabled={
            !form.formState.isDirty ||
            !form.formState.isValid ||
            updateDeckMutation.isLoading
          }
        >
          Save
        </button>
      </form>
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
