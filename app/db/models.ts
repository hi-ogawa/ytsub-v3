import { client } from "./client.server";

export interface UserTable {
  id: number;
  username: string;
  passwordHash: string; // TODO: hide this field from the client
  createdAt: Date;
  updatedAt: Date;
}

export const users = () => client<UserTable>("users");
