import { PrismaClient } from "@prisma/client";

export async function xxx() {
  const prisma = new PrismaClient();
  const count = await prisma.users.count();
  console.log({ count });
}
