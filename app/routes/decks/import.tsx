import { tinyassert } from "@hiogawa/utils";
import { useNavigate } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { R } from "../../misc/routes";
import { trpcClient } from "../../trpc/client-internal.client";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Import Deck",
};

export default function DefaultComponent() {
  return (
    <div className="w-full flex justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center border p-6">
        <FormComponent />
      </div>
    </div>
  );
}

function FormComponent() {
  const form = useForm<{ fileList?: FileList }>();
  const navigate = useNavigate();

  const mutation = useMutation(
    async () => {
      const { fileList } = form.getValues();
      const file = fileList?.[0];
      tinyassert(file);
      const data = await file.text();
      await trpcClient.decks_import.mutate({ data });
    },
    {
      onSuccess: () => {
        toast.success("Deck imported successfully!");
        navigate(R["/decks"]);
      },
      onError: () => {
        toast.error("Failed to import a deck");
      },
    }
  );

  return (
    <form
      className="w-full flex flex-col gap-4 relative"
      onSubmit={form.handleSubmit(() => mutation.mutate())}
    >
      <div className="text-lg">Import Deck</div>
      <label className="flex flex-col gap-1">
        <input
          type="file"
          accept="application/json"
          {...form.register("fileList", { required: true })}
        />
      </label>
      <button
        className={cls(
          "antd-btn antd-btn-primary p-1 flex justify-center items-center",
          mutation.isLoading && "antd-btn-loading"
        )}
        disabled={!form.formState.isValid || mutation.isLoading}
      >
        Import
      </button>
    </form>
  );
}
