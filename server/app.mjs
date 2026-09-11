import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pino from "pino";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { transaction } from "./db.mjs";
import {
  hashToken,
  token,
  passwordMatches,
  secretEqual,
  validSession,
} from "./security.mjs";
import { seedWorkspace } from "./seed.mjs";
import {
  customerSchema,
  orderSchema,
  loginSchema,
  listSchema,
  mapCustomer,
  mapOrder,
  escapeLike,
  pageMeta,
} from "../shared/contracts.mjs";
import { createRatesAdapter } from "./rates.mjs";
class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const fail = (status, code, message) => {
  throw new ApiError(status, code, message);
};
const parse = (schema, data) => schema.parse(data);
const uuid = (x) => parse(z.uuid(), x);
export function createApp({
  db,
  logger = pino({ level: process.env.LOG_LEVEL || "info" }),
  rates = createRatesAdapter(),
  origin = process.env.PUBLIC_ORIGIN || "http://localhost:5173",
  production = process.env.NODE_ENV === "production",
  originSecret = process.env.ORIGIN_SECRET,
  limits = process.env.RATE_LIMIT_ENABLED !== "false",
} = {}) {
  if (production && (!originSecret || originSecret.length < 32))
    throw new Error("Production requires a strong ORIGIN_SECRET");
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    const start = performance.now();
    res.on("finish", () =>
      logger.info(
        {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Math.round(performance.now() - start),
        },
        "request",
      ),
    );
    next();
  });
  app.use(helmet());
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (
      production &&
      !secretEqual(req.headers["x-origin-secret"], originSecret)
    )
      return next(
        new ApiError(
          403,
          "ORIGIN_DENIED",
          "Use the public dashboard to access this API.",
        ),
      );
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin !== origin
    )
      return next(
        new ApiError(
          403,
          "ORIGIN_DENIED",
          "This request origin is not allowed.",
        ),
      );
    next();
  });
  app.use(express.json({ limit: "16kb", strict: true }));
  app.use(cookieParser());
  if (limits)
    app.use(
      "/api",
      rateLimit({
        windowMs: 60000,
        limit: 120,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        handler: (req, res) =>
          res.status(429).json({
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests. Please try again in a minute.",
              requestId: req.requestId,
            },
          }),
      }),
    );
  app.get("/api/health", async (req, res) => {
    await db.query("SELECT 1");
    res.json({ status: "ok", service: "atlas-api", database: "connected" });
  });
  const loginLimit = rateLimit({
    windowMs: 3600000,
    limit: 12,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => !limits,
    handler: (req, res) =>
      res.status(429).json({
        error: {
          code: "LOGIN_LIMIT",
          message: "Demo login limit reached. Please try again later.",
          requestId: req.requestId,
        },
      }),
  });
  app.post("/api/auth/login", loginLimit, async (req, res) => {
    const body = parse(loginSchema, req.body);
    const user = (
      await db.query("SELECT * FROM users WHERE email=$1", [
        body.email.toLowerCase(),
      ])
    ).rows[0];
    if (!user || !(await passwordMatches(body.password, user.password_hash)))
      fail(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    const session = token(),
      csrfToken = token(),
      workspaceId = randomUUID();
    await transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(740032)");
      await c.query("DELETE FROM workspaces WHERE expires_at<now()");
      if (
        Number(
          (await c.query("SELECT count(*) FROM workspaces")).rows[0].count,
        ) >= 200
      )
        fail(
          503,
          "DEMO_CAPACITY",
          "The demo is at capacity. Please try again later.",
        );
      await c.query("INSERT INTO workspaces(id) VALUES($1)", [workspaceId]);
      await seedWorkspace(c, workspaceId);
      await c.query(
        "INSERT INTO sessions(token_hash,user_id,workspace_id,csrf_token) VALUES($1,$2,$3,$4)",
        [hashToken(session), user.id, workspaceId, csrfToken],
      );
    }, db);
    res.cookie("atlas_session", session, {
      httpOnly: true,
      secure: production,
      sameSite: "strict",
      path: "/api",
      maxAge: 8 * 3600000,
    });
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      csrfToken,
      workspaceId,
    });
  });
  app.use("/api", async (req, res, next) => {
    const raw = req.cookies.atlas_session;
    if (!raw || !/^\w{64}$/.test(raw))
      fail(401, "SESSION_EXPIRED", "Please sign in to continue.");
    const row = (
      await db.query(
        "SELECT s.*,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id JOIN workspaces w ON w.id=s.workspace_id WHERE s.token_hash=$1 AND w.expires_at>now()",
        [hashToken(raw)],
      )
    ).rows[0];
    if (!validSession(row))
      fail(
        401,
        "SESSION_EXPIRED",
        "Your session expired. Please sign in again.",
      );
    req.session = row;
    if (
      !["GET", "HEAD"].includes(req.method) &&
      !secretEqual(req.headers["x-csrf-token"], row.csrf_token)
    )
      fail(403, "CSRF_FAILED", "Refresh the page and try again.");
    next();
  });
  const admin = (req, res, next) => {
    if (req.session.role !== "admin")
      return next(
        new ApiError(
          403,
          "FORBIDDEN",
          "Admin access is required for this action.",
        ),
      );
    next();
  };
  app.get("/api/auth/session", (req, res) => {
    const s = req.session;
    res.json({
      user: { id: s.user_id, name: s.name, email: s.email, role: s.role },
      csrfToken: s.csrf_token,
      workspaceId: s.workspace_id,
    });
  });
  app.post("/api/auth/logout", async (req, res) => {
    await db.query("DELETE FROM sessions WHERE token_hash=$1", [
      req.session.token_hash,
    ]);
    res.clearCookie("atlas_session", {
      path: "/api",
      secure: production,
      httpOnly: true,
      sameSite: "strict",
    });
    res.status(204).end();
  });
  app.get("/api/overview", async (req, res) => {
    const w = req.session.workspace_id;
    const [summary, statuses, trend, recent] = await Promise.all([
      db.query(
        "SELECT (SELECT count(*)::integer FROM customers WHERE workspace_id=$1) AS customers,count(*)::integer AS orders,coalesce(sum(amount_cents) FILTER(WHERE status='completed'),0)::bigint AS revenue,count(*) FILTER(WHERE status IN ('pending','processing'))::integer AS open_orders FROM orders WHERE workspace_id=$1",
        [w],
      ),
      db.query(
        "SELECT status,count(*)::integer AS count FROM orders WHERE workspace_id=$1 GROUP BY status",
        [w],
      ),
      db.query(
        "SELECT to_char(d,'Mon DD') AS label,coalesce(sum(o.amount_cents) FILTER(WHERE o.status='completed'),0)::bigint AS total FROM generate_series(current_date-27,current_date,interval '1 day') d LEFT JOIN orders o ON o.workspace_id=$1 AND o.created_at::date=d::date GROUP BY d ORDER BY d",
        [w],
      ),
      db.query(
        "SELECT o.*,c.name AS customer_name,c.company FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.workspace_id=$1 ORDER BY o.created_at DESC,o.id DESC LIMIT 5",
        [w],
      ),
    ]);
    const a = summary.rows[0];
    res.json({
      customers: a.customers,
      orders: a.orders,
      revenueCents: Number(a.revenue),
      openOrders: a.open_orders,
      statuses: statuses.rows,
      trend: trend.rows.map((r) => ({
        label: r.label,
        totalCents: Number(r.total),
      })),
      recentOrders: recent.rows.map(mapOrder),
    });
  });
  for (const entity of ["customers", "orders"])
    app.get("/api/" + entity, async (req, res) => {
      const q = parse(listSchema, req.query),
        isOrders = entity === "orders";
      const statuses = isOrders
        ? ["all", "pending", "processing", "completed", "cancelled"]
        : ["all", "active", "inactive"];
      if (!statuses.includes(q.status))
        fail(400, "VALIDATION_ERROR", "Select a valid status.");
      const alias = isOrders ? "o" : "c",
        from = isOrders
          ? "orders o JOIN customers c ON c.id=o.customer_id"
          : "customers c";
      const where = `${alias}.workspace_id=$1 AND ($2='all' OR ${alias}.status=$2) AND ($3='' OR c.name ILIKE $4 OR c.company ILIKE $4 OR ${isOrders ? "o.reference" : "c.email"} ILIKE $4)`;
      const params = [
        req.session.workspace_id,
        q.status,
        q.search,
        "%" + escapeLike(q.search) + "%",
      ];
      const result = await transaction(async (c) => {
        await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
        const total = Number(
          (await c.query(`SELECT count(*) FROM ${from} WHERE ${where}`, params))
            .rows[0].count,
        );
        const meta = pageMeta(total, q.page, q.pageSize);
        const rows = (
          await c.query(
            `SELECT ${alias}.*${isOrders ? ",c.name AS customer_name,c.company" : ""} FROM ${from} WHERE ${where} ORDER BY ${alias}.created_at DESC,${alias}.id DESC LIMIT $5 OFFSET $6`,
            [...params, meta.pageSize, (meta.page - 1) * meta.pageSize],
          )
        ).rows;
        return { data: rows.map(isOrders ? mapOrder : mapCustomer), meta };
      }, db);
      res.json(result);
    });
  app.get("/api/customer-options", async (req, res) => {
    res.json({
      data: (
        await db.query(
          "SELECT id,name,company FROM customers WHERE workspace_id=$1 ORDER BY name LIMIT 100",
          [req.session.workspace_id],
        )
      ).rows,
    });
  });
  async function audit(c, req, action, entity, id, before, after) {
    const labels = {
      name: "name",
      email: "email",
      company: "company",
      status: "status",
      customer_id: "customer",
      description: "description",
      amount_cents: "amount",
    };
    const changed =
      action === "update"
        ? Object.entries(labels)
            .filter(([key]) => before[key] !== after[key])
            .map(([, label]) => label)
        : [];
    const detail =
      action === "update"
        ? changed.length
          ? ` · Changed ${changed.join(", ")}`
          : " · No field values changed"
        : "";
    await c.query(
      "INSERT INTO audit_logs(workspace_id,user_id,action,entity,entity_id,summary,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        req.session.workspace_id,
        req.session.user_id,
        action,
        entity,
        id,
        `${action[0].toUpperCase() + action.slice(1)}d ${entity}: ${(after || before).name || (after || before).reference}${detail}`,
        before,
        after,
      ],
    );
  }
  async function withCustomer(c, row) {
    const customer = await c.query(
      "SELECT name AS customer_name,company FROM customers WHERE id=$1 AND workspace_id=$2",
      [row.customer_id, row.workspace_id],
    );
    return { ...row, ...customer.rows[0] };
  }
  for (const entity of ["customers", "orders"]) {
    const isOrders = entity === "orders",
      schema = isOrders ? orderSchema : customerSchema,
      singular = isOrders ? "order" : "customer";
    app.post("/api/" + entity, admin, async (req, res) => {
      const b = parse(schema, req.body),
        id = randomUUID(),
        w = req.session.workspace_id;
      const row = await transaction(async (c) => {
        await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [w]);
        const n = Number(
          (
            await c.query(
              `SELECT count(*) FROM ${entity} WHERE workspace_id=$1`,
              [w],
            )
          ).rows[0].count,
        );
        if (n >= (isOrders ? 200 : 100))
          fail(
            409,
            "DEMO_RECORD_LIMIT",
            "This demo workspace has reached its record limit.",
          );
        let result;
        if (isOrders) {
          result = await c.query(
            "INSERT INTO orders(id,workspace_id,customer_id,reference,description,amount_cents,status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
            [
              id,
              w,
              b.customerId,
              "AT-" + randomUUID().slice(0, 8).toUpperCase(),
              b.description,
              b.amountCents,
              b.status,
            ],
          );
        } else {
          result = await c.query(
            "INSERT INTO customers(id,workspace_id,name,email,company,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
            [id, w, b.name, b.email, b.company, b.status],
          );
        }
        await audit(c, req, "create", singular, id, null, result.rows[0]);
        return isOrders ? withCustomer(c, result.rows[0]) : result.rows[0];
      }, db);
      res
        .status(201)
        .json({ data: isOrders ? mapOrder(row) : mapCustomer(row) });
    });
    app.put("/api/" + entity + "/:id", admin, async (req, res) => {
      const id = uuid(req.params.id),
        b = parse(schema, req.body),
        w = req.session.workspace_id;
      const row = await transaction(async (c) => {
        const before = (
          await c.query(
            `SELECT * FROM ${entity} WHERE id=$1 AND workspace_id=$2 FOR UPDATE`,
            [id, w],
          )
        ).rows[0];
        if (!before)
          fail(
            404,
            "NOT_FOUND",
            "This record no longer exists. Refresh the list.",
          );
        const result = isOrders
          ? await c.query(
              "UPDATE orders SET customer_id=$3,description=$4,amount_cents=$5,status=$6,updated_at=now() WHERE id=$1 AND workspace_id=$2 RETURNING *",
              [id, w, b.customerId, b.description, b.amountCents, b.status],
            )
          : await c.query(
              "UPDATE customers SET name=$3,email=$4,company=$5,status=$6,updated_at=now() WHERE id=$1 AND workspace_id=$2 RETURNING *",
              [id, w, b.name, b.email, b.company, b.status],
            );
        await audit(c, req, "update", singular, id, before, result.rows[0]);
        return isOrders ? withCustomer(c, result.rows[0]) : result.rows[0];
      }, db);
      res.json({ data: isOrders ? mapOrder(row) : mapCustomer(row) });
    });
    app.delete("/api/" + entity + "/:id", admin, async (req, res) => {
      const id = uuid(req.params.id);
      await transaction(async (c) => {
        const result = await c.query(
          `DELETE FROM ${entity} WHERE id=$1 AND workspace_id=$2 RETURNING *`,
          [id, req.session.workspace_id],
        );
        if (!result.rows[0])
          fail(404, "NOT_FOUND", "This record no longer exists.");
        await audit(c, req, "delete", singular, id, result.rows[0], null);
      }, db);
      res.status(204).end();
    });
  }
  app.get("/api/audit", admin, async (req, res) => {
    const { page, pageSize } = parse(listSchema, req.query);
    const w = req.session.workspace_id;
    const total = Number(
      (
        await db.query(
          "SELECT count(*) FROM audit_logs WHERE workspace_id=$1",
          [w],
        )
      ).rows[0].count,
    );
    const meta = pageMeta(total, page, pageSize);
    const rows = (
      await db.query(
        "SELECT a.id,a.action,a.entity,a.summary,a.created_at,u.name AS actor,u.role FROM audit_logs a JOIN users u ON u.id=a.user_id WHERE a.workspace_id=$1 ORDER BY a.id DESC LIMIT $2 OFFSET $3",
        [w, meta.pageSize, (meta.page - 1) * meta.pageSize],
      )
    ).rows;
    res.json({ data: rows, meta });
  });
  app.get("/api/integrations/rates", async (req, res) => {
    const { scenario } = parse(
      z
        .object({
          scenario: z.enum(["live", "timeout", "bad-response"]).default("live"),
        })
        .strict(),
      req.query,
    );
    const data = await rates(scenario);
    logger.info(
      {
        requestId: req.requestId,
        integration: "Frankfurter",
        status: data.status,
        scenario,
      },
      "integration",
    );
    res.json(data);
  });
  app.use((req, res, next) =>
    next(new ApiError(404, "NOT_FOUND", "API route not found.")),
  );
  app.use((err, req, res, next) => {
    let status = err.status || 500,
      code = err.code || "INTERNAL_ERROR",
      message = err.message,
      fields;
    if (err instanceof z.ZodError) {
      status = 400;
      code = "VALIDATION_ERROR";
      message = "Please check the submitted fields.";
      fields = Object.fromEntries(
        err.issues.map((i) => [i.path.join("."), i.message]),
      );
    } else if (err.code === "23505") {
      status = 409;
      code = "DUPLICATE_RECORD";
      message = "A record with these details already exists.";
    } else if (err.code === "23503") {
      status = 409;
      code = "RELATED_RECORD";
      message =
        req.method === "DELETE"
          ? "This customer has orders. Remove its orders first."
          : "Choose a customer from this workspace.";
    } else if (err.type === "entity.too.large") {
      status = 413;
      code = "REQUEST_TOO_LARGE";
      message = "The request is too large.";
    } else if (err instanceof SyntaxError && err.status === 400) {
      status = 400;
      code = "INVALID_JSON";
      message = "Request body must be valid JSON.";
    }
    if (status >= 500) {
      logger.error(
        { requestId: req.requestId, errorType: err.name, code: err.code },
        "request failed",
      );
      message = "The service is temporarily unavailable. Please retry.";
      code = "SERVICE_UNAVAILABLE";
    }
    res.status(status).json({
      error: {
        code,
        message,
        requestId: req.requestId,
        ...(fields && { fields }),
      },
    });
  });
  return app;
}
