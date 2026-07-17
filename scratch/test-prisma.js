const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
    }
  }
});
async function main() {
  try {
    await prisma.$connect();
    console.log("SUCCESS!");
  } catch (e) {
    console.error("FAIL:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
