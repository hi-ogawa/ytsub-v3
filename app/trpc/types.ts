import type { trpcApp } from "./server";

export type TrpcRecord = (typeof trpcApp)["_def"]["record"];

export type TrpcType = {
  [K in keyof TrpcRecord]: TrpcRecord[K]["_type"];
};

export type TrpcInput = {
  [K in keyof TrpcRecord]: TrpcRecord[K]["_def"]["_input_in"];
};

export type TrpcOutput = {
  [K in keyof TrpcRecord]: TrpcRecord[K]["_def"]["_output_out"];
};
