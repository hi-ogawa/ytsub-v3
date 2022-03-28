import { client } from "./client";

export interface UserTable {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export const users = () => client<UserTable>("users");
