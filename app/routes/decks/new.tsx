import { useNavigate } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import {
  DEFAULT_DECK_OPTIONS,
  NewDeckRequest,
  createNewDeckMutation,
} from "./new-api";

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
// component
//

export default function DefaultComponent() {
  const navigate = useNavigate();

  const newDeckMutation = useMutation({
    ...createNewDeckMutation(),
    onSuccess: (res) => {
      toast.success("Successfuly created a deck");
      navigate(R["/decks/$id"](res.deckId));
    },
    onError: () => {
      toast.error("Failed to create a deck");
    },
  });

  const form = useForm<NewDeckRequest>({
    defaultValues: {
      name: "",
      ...DEFAULT_DECK_OPTIONS,
    },
  });

  return (
    <div className="w-full p-4 flex justify-center">
      <form
        method="post"
        className="flex flex-col border w-full max-w-sm p-4 px-6 gap-3"
        data-test="new-deck-form"
        onSubmit={form.handleSubmit((data) => newDeckMutation.mutate(data))}
      >
        <h1 className="text-lg">New Deck</h1>
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
            {...form.register("newEntriesPerDay", { required: true })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-colorTextLabel">Reviews per day</span>
          <input
            type="number"
            className="antd-input p-1"
            {...form.register("reviewsPerDay", { required: true })}
          />
        </label>
        <button
          type="submit"
          className={cls(
            "antd-btn antd-btn-primary p-1",
            newDeckMutation.isLoading && "antd-btn-loading"
          )}
          disabled={!form.formState.isValid || newDeckMutation.isLoading}
        >
          Create
        </button>
      </form>
    </div>
  );
}
