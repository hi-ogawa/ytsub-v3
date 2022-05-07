import { CHECK_ASSIGNABLE } from "../utils/misc";
import { FilterKeys } from "../utils/type-utils";
import RAW_SCHEMA from "./schema";

// type check constants to make sure "Type" is enumerated
CHECK_ASSIGNABLE<Record<string, RawTableInfo>>(RAW_SCHEMA);

type RawTableInfo = Record<string, RawColumnInfo>;

interface RawColumnInfo {
  Type:
    | "int"
    | "bigint"
    | "float"
    | "datetime"
    | "text"
    | "varchar(32)"
    | "varchar(128)";
  Null: "YES" | "NO";
}

// prettier-ignore
type FromRawType<C extends string> =
  C extends "int" | "bigint" | "number" ? number :
  C extends "text" | "varchar(32)" | "varchar(128)" ? string :
  C extends "datetime" ? Date : never;

// prettier-ignore
export type DeriveTableType<T extends RawTableInfo> =
  { [C in FilterKeys<T, { Null: "YES" }>]?: FromRawType<T[C]["Type"]>; } &
  { [C in FilterKeys<T, { Null: "NO"  }>] : FromRawType<T[C]["Type"]>; };

export type RawSchema = typeof RAW_SCHEMA;
