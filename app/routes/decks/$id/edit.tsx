import { useNavigate } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { DeckNavBarMenuComponent } from ".";
import { $R, R } from "../../../misc/routes";
import { rpcClientQuery } from "../../../trpc/client";
import { intl } from "../../../utils/intl";
import { useLoaderDataExtra } from "../../../utils/loader-utils";
import { cls } from "../../../utils/misc";
import type { PageHandle } from "../../../utils/page-handle";
import { toastInfo } from "../../../utils/toast-utils";

import type { LoaderData } from "./_utils.server";
export { loader } from "./_utils.server";

export const handle: PageHandle = {
  navBarTitle: () => "Edit Deck",
  navBarMenu: () => <DeckNavBarMenuComponent />,
};

export default function DefaultComponent() {
  return (
    <div className="w-full flex justify-center p-4">
      <DefaultComponentInner />
    </div>
  );
}

function DefaultComponentInner() {
  const { deck } = useLoaderDataExtra() as LoaderData;

  const form = useForm({ defaultValues: deck });

  const updateDeckMutation = useMutation({
    ...rpcClientQuery.decks_update.mutationOptions(),
    onSuccess: () => {
      toast.success("Successfully updated a deck");
      form.reset(form.getValues());
    },
    onError: () => {
      toast.error("Failed to update a deck");
    },
  });

  const navigate = useNavigate();

  const deckDestroyMutation = useMutation({
    ...rpcClientQuery.decks_destroy.mutationOptions(),
    onSuccess: () => {
      toast.success("Successfully deleted a deck");
      navigate(R["/decks"]);
    },
    onError: () => {
      toast.error("Failed to delete a deck");
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
            value={intl.formatDate(deck.createdAt, {
              dateStyle: "long",
              timeStyle: "long",
              hour12: false,
            })}
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
          href={$R["/decks/$id/export"](deck)}
          // avoid `json` since it cannot be attached on github editor https://github.com/isaacs/github/issues/1130
          download={`ytsub-deck-export--${deck.name}.txt`}
        >
          Export JSON
        </a>
      </div>
      <div className="flex flex-col border w-full p-6 gap-3 border-colorErrorBorder">
        <h1 className="text-lg">Danger Zone</h1>
        <button
          className={cls(
            "w-full antd-btn antd-btn-default p-1",
            deckDestroyMutation.isLoading && "antd-btn-loading"
          )}
          disabled={deckDestroyMutation.isLoading}
          onClick={() => {
            const message = `Are you sure? Please type '${deck.name}' to delete this deck.`;
            const response = window.prompt(message);
            if (response !== deck.name) {
              toastInfo("Deletion canceled");
              return;
            }
            deckDestroyMutation.mutate(deck);
          }}
        >
          Delete this deck
        </button>
      </div>
    </div>
  );
}
