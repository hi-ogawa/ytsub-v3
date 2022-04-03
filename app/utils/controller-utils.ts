import { LoaderFunction, Session, json } from "@remix-run/server-runtime";
import superjson from "superjson";
import { UserTable } from "../db/models";
import { getSessionUser } from "./auth";
import { getRequestSession, withResponseSession } from "./session-utils";

type LoaderArgs = Parameters<LoaderFunction>[0];
type LoaderResult = ReturnType<LoaderFunction>;

export function makeLoader<C, R>(
  options: {
    create: (args: LoaderArgs) => Promise<C>;
    finalize: (controller: C, result: R) => LoaderResult;
  },
  method: (this: C) => R
): LoaderFunction {
  return async function (args: LoaderArgs) {
    const controller = await options.create(args);
    const result = await method.apply(controller);
    return options.finalize(controller, result);
  };
}

export class Controller {
  constructor(
    public args: LoaderArgs,
    public request: Request,
    public session: Session
  ) {}

  static async create(loaderArgs: LoaderArgs): Promise<Controller> {
    const { request } = loaderArgs;
    const session = await getRequestSession(request);
    return new Controller(loaderArgs, request, session);
  }

  static async finalize(
    controller: Controller,
    result: LoaderResult
  ): Promise<LoaderResult> {
    const response = result instanceof Response ? result : json(result);
    await withResponseSession(response, controller.session);
    return response;
  }

  async currentUser(): Promise<UserTable | undefined> {
    return getSessionUser(this.session);
  }

  serialize(data: any): any {
    return superjson.serialize(data);
  }
}

export const deserialize = superjson.deserialize;
