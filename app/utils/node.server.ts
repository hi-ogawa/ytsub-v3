import * as crypto_ from "crypto";
export const crypto = crypto_;

import * as childProcess from "child_process";
import { promisify } from "util";
export const exec = promisify(childProcess.exec);
