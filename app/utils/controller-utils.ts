import {
  LoaderFunction,
  Session,
  json,
  redirect,
} from "@remix-run/server-runtime";
import { isEqual } from "lodash";
import superjson from "superjson";
import { UserTable } from "../db/models";
import { R } from "../misc/routes";
import { getSessionUser, getSessionUserId } from "./auth";
import { FlashMessage, pushFlashMessage } from "./flash-message";
import { getRequestSession, withResponseSession } from "./session-utils";
import { fromRequestForm, fromRequestQuery } from "./url-data";

//
// Implementing controller-style request handler (as in Rails controller)
//

type LoaderArgs = Parameters<LoaderFunction>[0];
type LoaderResult = ReturnType<LoaderFunction>;

export function makeLoader<C, R>(
  options: {
    create: (args: LoaderArgs) => Promise<C>;
    finalize: (controller: C, result: R) => LoaderResult;
    rescue: (controller: C, caught: any) => LoaderResult;
  },
  method: (this: C) => R
): LoaderFunction {
  return async function (args: LoaderArgs) {
    const controller = await options.create(args);
    try {
      const result = await method.apply(controller);
      return await options.finalize(controller, result);
    } catch (error) {
      return await options.rescue(controller, error);
    }
  };
}

export class Controller {
  constructor(
    public args: LoaderArgs,
    public request: Request,
    public session: Session,
    public initialSessionData: any
  ) {}

  static async create(loaderArgs: LoaderArgs): Promise<Controller> {
    const { request } = loaderArgs;
    const session = await getRequestSession(request);
    return new Controller(loaderArgs, request, session, session.data);
  }

  static async finalize(
    controller: Controller,
    result: LoaderResult
  ): Promise<LoaderResult> {
    const response = result instanceof Response ? result : json(result);
    if (!isEqual(controller.session.data, controller.initialSessionData)) {
      await withResponseSession(response, controller.session);
    }
    return response;
  }

  static async rescue(
    controller: Controller,
    caught: any
  ): Promise<LoaderResult> {
    if (caught instanceof Response) {
      if (!isEqual(controller.session.data, controller.initialSessionData)) {
        await withResponseSession(caught, controller.session);
      }
    }
    throw caught;
  }

  query(): any {
    return fromRequestQuery(this.request);
  }

  async form(): Promise<any> {
    return fromRequestForm(this.request);
  }

  currentUserId(): number | undefined {
    return getSessionUserId(this.session);
  }

  async currentUser(): Promise<UserTable | undefined> {
    return getSessionUser(this.session);
  }

  async requireUser(): Promise<UserTable> {
    const user = await this.currentUser();
    if (!user) {
      this.flash({ content: "Signin required", variant: "error" });
      throw redirect(R["/users/signin"]);
    }
    return user;
  }

  flash(message: FlashMessage): void {
    pushFlashMessage(this.session, message);
  }

  serialize(data: any): any {
    return superjson.serialize(data);
  }
}

export const deserialize = superjson.deserialize as (_: any) => any;
