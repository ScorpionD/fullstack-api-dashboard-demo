import { randomUUID } from "node:crypto";
import { passwordHash } from "./security.mjs";
export async function seedUsers(db) {
  for (const [email, name, role, password] of [
    [
      "admin@atlas.demo",
      "Alex Morgan",
      "admin",
      process.env.DEMO_ADMIN_PASSWORD || "DemoAdmin2026!",
    ],
    [
      "viewer@atlas.demo",
      "Jamie Lee",
      "user",
      process.env.DEMO_USER_PASSWORD || "DemoViewer2026!",
    ],
  ]) {
    await db.query(
      "INSERT INTO users(id,email,name,role,password_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash",
      [randomUUID(), email, name, role, await passwordHash(password)],
    );
  }
}
const companies = [
  "Northstar Studio",
  "Juniper Works",
  "Orbit Labs",
  "Evergreen Supply",
  "Solstice Design",
  "Meridian Health",
  "Copper & Oak",
  "Aster Creative",
  "Beacon Systems",
  "Willow Collective",
  "Alpine Ventures",
  "Mosaic Digital",
  "Pioneer Goods",
  "Cedar Partners",
  "Lumen Space",
  "Harbor & Co",
  "Fable Studio",
  "Terra Commerce",
  "Cobalt Analytics",
  "Summit Interiors",
  "Forma Group",
  "Opal Strategy",
  "Echo Products",
  "Vista Research",
];
const names = [
  "Olivia Bennett",
  "Noah Carter",
  "Amelia Hayes",
  "Liam Brooks",
  "Sophia Reed",
  "Ethan Foster",
  "Isabella Gray",
  "Lucas Morgan",
  "Mia Clarke",
  "James Parker",
  "Charlotte Hill",
  "Benjamin Scott",
  "Harper Adams",
  "Henry Turner",
  "Evelyn Collins",
  "Alexander Evans",
  "Aria Mitchell",
  "Daniel Cooper",
  "Ella Phillips",
  "William Ward",
  "Sofia Howard",
  "Oliver Ross",
  "Ava Watson",
  "Leo Bailey",
];
export async function seedWorkspace(db, workspaceId) {
  const ids = [];
  for (let i = 0; i < companies.length; i++) {
    const id = randomUUID();
    ids.push(id);
    await db.query(
      "INSERT INTO customers(id,workspace_id,name,email,company,status,created_at) VALUES($1,$2,$3,$4,$5,$6,now()-($7::integer*interval '1 day'))",
      [
        id,
        workspaceId,
        names[i],
        `contact${i + 1}@example.com`,
        companies[i],
        i % 6 === 0 ? "inactive" : "active",
        i + 1,
      ],
    );
  }
  for (let i = 0; i < 48; i++) {
    await db.query(
      "INSERT INTO orders(id,workspace_id,customer_id,reference,description,amount_cents,status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()-($8::integer*interval '1 day'))",
      [
        randomUUID(),
        workspaceId,
        ids[i % 24],
        `AT-${1048 - i}`,
        [
          "Website maintenance",
          "API integration sprint",
          "Design system support",
          "Data migration",
          "Support retainer",
          "Analytics setup",
        ][i % 6],
        [240000, 85000, 164000, 420000, 65000, 125000][i % 6] + i * 1300,
        [
          "completed",
          "processing",
          "pending",
          "completed",
          "completed",
          "cancelled",
        ][i % 6],
        i % 30,
      ],
    );
  }
}
