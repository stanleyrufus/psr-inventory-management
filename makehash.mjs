// makehash.mjs
import bcrypt from "bcrypt";

const run = async () => {
  const hash = await bcrypt.hash("admin123", 10);
  console.log("Generated hash:\n", hash);
};

run();
