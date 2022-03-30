import { client } from "./client.server";

export interface UserTable {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export const users = () => client<UserTable>("users");
