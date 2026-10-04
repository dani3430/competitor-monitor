import { cpSync, mkdirSync } from "node:fs";

mkdirSync("public/data", { recursive: true });
cpSync("../data/snapshot.json", "public/data/snapshot.json");
cpSync("../data/history.json", "public/data/history.json");
console.log("Data synced into public/data");