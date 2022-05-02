/* eslint-disable no-undef */
db.auth("fastswap", "fastswap");

db.createUser({
  user: "fastswap",
  pwd: "fastswap",
  roles: [{ role: "readWrite", db: "fastswap" }],
});
