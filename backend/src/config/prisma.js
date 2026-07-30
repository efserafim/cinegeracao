const { PrismaClient } = require("@prisma/client");
const { databaseUrlWithPoolLimit } = require("./databaseUrl");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrlWithPoolLimit(process.env.DATABASE_URL)
    }
  },
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

module.exports = prisma;
