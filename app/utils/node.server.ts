import * as childProcess from "child_process";
import * as crypto from "crypto";
import { promisify } from "util";

export { crypto as crypto };
export const exec = promisify(childProcess.exec);
