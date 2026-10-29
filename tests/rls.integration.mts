/**
 * Live integration verification against a real Supabase project.
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Run with: npm run test:integration
 *
 * The script creates two disposable accounts and exercises signup triggers, product CRUD,
 * stock adjustments, settings, and cross-tenant isolation. It never prints secret values.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(here, "..", ".env.local"), "utf8");

function envValue(name: string): string {
  const match = envText.match(new RegExp(`^${name}=(.*)$`, "m"));
  return (match?.[1] ?? "").trim();
}

const SUPABASE_URL = envValue("NEXT_PUBLIC_SUPABASE_URL");
const ANON_KEY = envValue("NEXT_PUBLIC_SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(2);
}

const stamp = Date.now().toString(36);
const PASSWORD = "Stockflow-QA-2026!";
// Plain `example.com` addresses are rejected by Supabase's email validator as reserved,
// so the disposable-but-valid `mailinator.com` domain is used instead.
const emailA = `stockflow.qa.${stamp}.a@mailinator.com`;
const emailB = `stockflow.qa.${stamp}.b@mailinator.com`;
const emailC = `stockflow.qa.${stamp}.c@mailinator.com`;

const results: { name: string; pass: boolean; detail: string }[] = [];

function check(name: string, pass: boolean, detail = "") {
  results.push({ name, pass, detail });
}

type Json = Record<string, any>;

async function api(
  path: string,
  init: RequestInit & { token?: string; prefer?: string } = {},
): Promise<{ status: number; body: any }> {
  const { token, prefer, ...rest } = init;
  const headers: Record<string, string> = {
    apikey: ANON_KEY,
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(`${SUPABASE_URL}${path}`, { ...rest, headers });
  const text = await response.text();
  let body: any = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw text */
  }
  return { status: response.status, body };
}

async function signUp(email: string, organizationName: string) {
  return api("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, data: { organization_name: organizationName } }),
  });
}

async function signUpWithInvite(email: string, inviteCode: string) {
  return api("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, data: { invite_code: inviteCode } }),
  });
}

async function main() {
  // ------------------------------------------------------------------ Step 4: auth
  const signupA = await signUp(emailA, "QA Tenant A");
  const tokenA: string | undefined = signupA.body?.access_token;

  check(
    "signup A returns a session (email confirmation disabled)",
    Boolean(tokenA),
    `status=${signupA.status} ${tokenA ? "session present" : "no session returned"}`,
  );

  if (!tokenA) {
    report();
    console.error(
      "\nEmail confirmation appears to be ENABLED. Disable it in Authentication -> Sign In / Providers -> Email,\n" +
        "or confirm the emailed link, then re-run this script.",
    );
    process.exit(3);
  }

  const userAId: string = signupA.body.user.id;

  // ------------------------------------------------- Step 2 of the prompt: trigger
  const orgsA = await api("/rest/v1/organizations?select=id,name,default_low_stock_threshold", { token: tokenA });
  check(
    "signup trigger created exactly one organization for A",
    orgsA.status === 200 && Array.isArray(orgsA.body) && orgsA.body.length === 1,
    `status=${orgsA.status} rows=${Array.isArray(orgsA.body) ? orgsA.body.length : "n/a"}`,
  );
  check(
    "organization name came from signup metadata",
    orgsA.body?.[0]?.name === "QA Tenant A",
    `name=${orgsA.body?.[0]?.name}`,
  );
  check(
    "organization default_low_stock_threshold defaults to 5",
    orgsA.body?.[0]?.default_low_stock_threshold === 5,
    `value=${orgsA.body?.[0]?.default_low_stock_threshold}`,
  );

  const orgAId: string | undefined = orgsA.body?.[0]?.id;

  const profilesA = await api("/rest/v1/profiles?select=id,organization_id,email", { token: tokenA });
  check(
    "signup trigger created the profile and linked it to the organization",
    profilesA.status === 200 &&
      profilesA.body?.[0]?.id === userAId &&
      profilesA.body?.[0]?.organization_id === orgAId &&
      profilesA.body?.[0]?.email === emailA,
    `status=${profilesA.status} rows=${Array.isArray(profilesA.body) ? profilesA.body.length : "n/a"}`,
  );

  const anonOrgs = await api("/rest/v1/organizations?select=id");
  check(
    "RLS blocks anonymous reads of organizations",
    anonOrgs.status === 200 && Array.isArray(anonOrgs.body) && anonOrgs.body.length === 0,
    `status=${anonOrgs.status} rows=${Array.isArray(anonOrgs.body) ? anonOrgs.body.length : "n/a"}`,
  );

  // --------------------------------------------------- Step 4 of the prompt: CRUD
  const created = await api("/rest/v1/products", {
    method: "POST",
    token: tokenA,
    prefer: "return=representation",
    body: JSON.stringify({
      organization_id: orgAId,
      name: "Widget",
      sku: `SKU-${stamp}-1`,
      description: "QA product",
      quantity_on_hand: 4,
      cost_price: 2.5,
      selling_price: 9.99,
      low_stock_threshold: null,
    }),
  });
  const productAId: string | undefined = created.body?.[0]?.id;
  check(
    "product creation succeeds and returns the row",
    created.status === 201 && Boolean(productAId),
    `status=${created.status}`,
  );

  const duplicate = await api("/rest/v1/products", {
    method: "POST",
    token: tokenA,
    body: JSON.stringify({ organization_id: orgAId, name: "Widget copy", sku: `SKU-${stamp}-1`, quantity_on_hand: 0 }),
  });
  check(
    "duplicate SKU is rejected within the organization (23505)",
    duplicate.body?.code === "23505",
    `status=${duplicate.status} code=${duplicate.body?.code}`,
  );

  const updated = await api(`/rest/v1/products?id=eq.${productAId}`, {
    method: "PATCH",
    token: tokenA,
    prefer: "return=representation",
    body: JSON.stringify({ name: "Widget Mk II", quantity_on_hand: 7 }),
  });
  check(
    "product edit persists",
    updated.status === 200 && updated.body?.[0]?.name === "Widget Mk II" && updated.body?.[0]?.quantity_on_hand === 7,
    `status=${updated.status}`,
  );
  check(
    "updated_at is maintained by the trigger",
    Boolean(updated.body?.[0]?.updated_at) && updated.body?.[0]?.updated_at !== updated.body?.[0]?.created_at,
    "updated_at differs from created_at",
  );

  // --------------------------------------------------- Step 6: stock adjustments
  const plus = await api("/rest/v1/rpc/adjust_stock", {
    method: "POST",
    token: tokenA,
    body: JSON.stringify({ p_product_id: productAId, p_delta: 10, p_note: "QA restock" }),
  });
  check("positive stock adjustment increases quantity", plus.status === 200 && plus.body === 17, `result=${plus.body}`);

  const minus = await api("/rest/v1/rpc/adjust_stock", {
    method: "POST",
    token: tokenA,
    body: JSON.stringify({ p_product_id: productAId, p_delta: -3 }),
  });
  check("negative stock adjustment decreases quantity", minus.status === 200 && minus.body === 14, `result=${minus.body}`);

  const tooFar = await api("/rest/v1/rpc/adjust_stock", {
    method: "POST",
    token: tokenA,
    body: JSON.stringify({ p_product_id: productAId, p_delta: -100 }),
  });
  check(
    "adjustment below zero is rejected",
    tooFar.body?.code === "P0001" && String(tooFar.body?.message).includes("negative stock"),
    `code=${tooFar.body?.code}`,
  );

  const zero = await api("/rest/v1/rpc/adjust_stock", {
    method: "POST",
    token: tokenA,
    body: JSON.stringify({ p_product_id: productAId, p_delta: 0 }),
  });
  check("zero adjustment is rejected", zero.body?.code === "P0001", `code=${zero.body?.code}`);

  const afterAdjust = await api(`/rest/v1/products?id=eq.${productAId}&select=quantity_on_hand,last_updated_by`, {
    token: tokenA,
  });
  check(
    "adjustment records last_updated_by and leaves quantity at 14",
    afterAdjust.body?.[0]?.quantity_on_hand === 14 && afterAdjust.body?.[0]?.last_updated_by === userAId,
    `qty=${afterAdjust.body?.[0]?.quantity_on_hand}`,
  );

  // --------------------------------------------------- Step 7: movement history
  const movements = await api(
    `/rest/v1/stock_movements?product_id=eq.${productAId}&select=delta,quantity_after,reason,note&order=created_at.asc`,
    { token: tokenA },
  );
  check(
    "a movement is recorded for creation, edits and each adjustment",
    movements.status === 200 && Array.isArray(movements.body) && movements.body.length === 4,
    `rows=${Array.isArray(movements.body) ? movements.body.length : "n/a"}`,
  );
  check(
    "the initial quantity is recorded as a 'created' movement",
    movements.body?.[0]?.reason === "created" && movements.body?.[0]?.delta === 4,
    `reason=${movements.body?.[0]?.reason} delta=${movements.body?.[0]?.delta}`,
  );
  check(
    "an adjustment stores its note and resulting quantity",
    movements.body?.some(
      (m: Json) => m.delta === 10 && m.quantity_after === 17 && m.note === "QA restock",
    ),
    "delta=10 qty_after=17 note=QA restock",
  );
  check(
    "rejected adjustments leave no movement behind",
    !movements.body?.some((m: Json) => m.delta === -100 || m.delta === 0),
    "no rows for rejected deltas",
  );

  // ------------------------------------------------------ Step 14: zero threshold
  const zeroThreshold = await api(`/rest/v1/products?id=eq.${productAId}`, {
    method: "PATCH",
    token: tokenA,
    prefer: "return=representation",
    body: JSON.stringify({ low_stock_threshold: 0 }),
  });
  check(
    "a product-level threshold of 0 is stored as 0, not null",
    zeroThreshold.body?.[0]?.low_stock_threshold === 0,
    `stored=${JSON.stringify(zeroThreshold.body?.[0]?.low_stock_threshold)}`,
  );

  // ------------------------------------------------- Step 15: settings threshold
  const settings = await api(`/rest/v1/organizations?id=eq.${orgAId}`, {
    method: "PATCH",
    token: tokenA,
    prefer: "return=representation",
    body: JSON.stringify({ default_low_stock_threshold: 3 }),
  });
  check(
    "default low-stock threshold can be updated",
    settings.status === 200 && settings.body?.[0]?.default_low_stock_threshold === 3,
    `status=${settings.status}`,
  );

  // ------------------------------------------- Step 5: tenant isolation (account B)
  const signupB = await signUp(emailB, "QA Tenant B");
  const tokenB: string | undefined = signupB.body?.access_token;
  check("signup B returns a session", Boolean(tokenB), `status=${signupB.status}`);

  const orgsB = await api("/rest/v1/organizations?select=id,name", { token: tokenB });
  const orgBId: string | undefined = orgsB.body?.[0]?.id;
  check(
    "account B got a different organization",
    orgsB.body?.length === 1 && orgBId !== orgAId && orgsB.body?.[0]?.name === "QA Tenant B",
    `orgB=${orgBId === orgAId ? "same as A" : "distinct"}`,
  );

  const bReadsA = await api(`/rest/v1/products?id=eq.${productAId}&select=id`, { token: tokenB });
  check(
    "B cannot read A's product by guessed id",
    bReadsA.status === 200 && Array.isArray(bReadsA.body) && bReadsA.body.length === 0,
    `status=${bReadsA.status} rows=${Array.isArray(bReadsA.body) ? bReadsA.body.length : "n/a"}`,
  );

  const bListsAll = await api("/rest/v1/products?select=id", { token: tokenB });
  check(
    "B's product list does not include A's product",
    Array.isArray(bListsAll.body) && bListsAll.body.length === 0,
    `rows=${Array.isArray(bListsAll.body) ? bListsAll.body.length : "n/a"}`,
  );

  const bWritesA = await api(`/rest/v1/products?id=eq.${productAId}`, {
    method: "PATCH",
    token: tokenB,
    prefer: "return=representation",
    body: JSON.stringify({ name: "hijacked" }),
  });
  check(
    "B cannot modify A's product",
    bWritesA.status === 200 && Array.isArray(bWritesA.body) && bWritesA.body.length === 0,
    `status=${bWritesA.status} affected=${Array.isArray(bWritesA.body) ? bWritesA.body.length : "n/a"}`,
  );

  const bDeletesA = await api(`/rest/v1/products?id=eq.${productAId}`, {
    method: "DELETE",
    token: tokenB,
    prefer: "return=representation",
  });
  check(
    "B cannot delete A's product",
    bDeletesA.status === 200 && Array.isArray(bDeletesA.body) && bDeletesA.body.length === 0,
    `status=${bDeletesA.status} affected=${Array.isArray(bDeletesA.body) ? bDeletesA.body.length : "n/a"}`,
  );

  const bInsertsIntoA = await api("/rest/v1/products", {
    method: "POST",
    token: tokenB,
    body: JSON.stringify({ organization_id: orgAId, name: "Injected", sku: `SKU-${stamp}-inj`, quantity_on_hand: 0 }),
  });
  check(
    "B cannot insert a product into A's organization (RLS with check)",
    bInsertsIntoA.body?.code === "42501" || bInsertsIntoA.status === 403,
    `status=${bInsertsIntoA.status} code=${bInsertsIntoA.body?.code}`,
  );

  const bAdjustsA = await api("/rest/v1/rpc/adjust_stock", {
    method: "POST",
    token: tokenB,
    body: JSON.stringify({ p_product_id: productAId, p_delta: 5 }),
  });
  check(
    "B cannot adjust stock on A's product",
    bAdjustsA.body?.code === "P0001" && String(bAdjustsA.body?.message).includes("not found"),
    `code=${bAdjustsA.body?.code}`,
  );

  const bReadsMovements = await api(
    `/rest/v1/stock_movements?product_id=eq.${productAId}&select=id`,
    { token: tokenB },
  );
  check(
    "B cannot read A's stock movements",
    Array.isArray(bReadsMovements.body) && bReadsMovements.body.length === 0,
    `rows=${Array.isArray(bReadsMovements.body) ? bReadsMovements.body.length : "n/a"}`,
  );

  const bSeesOrgA = await api(`/rest/v1/organizations?id=eq.${orgAId}&select=id`, { token: tokenB });
  check(
    "B cannot read A's organization",
    Array.isArray(bSeesOrgA.body) && bSeesOrgA.body.length === 0,
    `rows=${Array.isArray(bSeesOrgA.body) ? bSeesOrgA.body.length : "n/a"}`,
  );

  const bUpdatesOrgA = await api(`/rest/v1/organizations?id=eq.${orgAId}`, {
    method: "PATCH",
    token: tokenB,
    prefer: "return=representation",
    body: JSON.stringify({ default_low_stock_threshold: 999 }),
  });
  check(
    "B cannot modify A's organization",
    Array.isArray(bUpdatesOrgA.body) && bUpdatesOrgA.body.length === 0,
    `affected=${Array.isArray(bUpdatesOrgA.body) ? bUpdatesOrgA.body.length : "n/a"}`,
  );

  const bReadsAProfile = await api(`/rest/v1/profiles?id=eq.${userAId}&select=id`, { token: tokenB });
  check(
    "B cannot read A's profile",
    Array.isArray(bReadsAProfile.body) && bReadsAProfile.body.length === 0,
    `rows=${Array.isArray(bReadsAProfile.body) ? bReadsAProfile.body.length : "n/a"}`,
  );

  // ------------------------------------------------ Step 8: roles and invites
  const profileARole = await api(`/rest/v1/profiles?id=eq.${userAId}&select=role`, { token: tokenA });
  check(
    "the founding member is provisioned as owner",
    profileARole.body?.[0]?.role === "owner",
    `role=${profileARole.body?.[0]?.role}`,
  );

  const inviteCode = `QA${stamp}`.toUpperCase();
  const invite = await api("/rest/v1/organization_invites", {
    method: "POST",
    token: tokenA,
    prefer: "return=representation",
    body: JSON.stringify({ organization_id: orgAId, code: inviteCode, created_by: userAId }),
  });
  check(
    "an owner can create an invite code",
    invite.status === 201 && invite.body?.[0]?.code === inviteCode,
    `status=${invite.status} code=${invite.body?.[0]?.code}`,
  );

  const invitesRead = await api("/rest/v1/organization_invites?select=code", { token: tokenA });
  check(
    "an owner can list the organization's invites",
    Array.isArray(invitesRead.body) && invitesRead.body.some((i: Json) => i.code === inviteCode),
    `rows=${Array.isArray(invitesRead.body) ? invitesRead.body.length : "n/a"}`,
  );

  const signupC = await signUpWithInvite(emailC, inviteCode);
  const tokenC: string | undefined = signupC.body?.access_token;
  const userCId: string | undefined = signupC.body?.user?.id;
  check("signup with an invite code succeeds", Boolean(tokenC), `status=${signupC.status}`);

  const orgsC = await api("/rest/v1/organizations?select=id,name", { token: tokenC });
  check(
    "an invited signup joins the existing organization instead of creating one",
    orgsC.body?.length === 1 && orgsC.body?.[0]?.id === orgAId,
    `orgs=${Array.isArray(orgsC.body) ? orgsC.body.length : "n/a"} name=${orgsC.body?.[0]?.name}`,
  );

  const profileC = await api(`/rest/v1/profiles?id=eq.${userCId}&select=role,organization_id`, {
    token: tokenC,
  });
  check(
    "the invited member is provisioned as a member of the owner's organization",
    profileC.body?.[0]?.role === "member" && profileC.body?.[0]?.organization_id === orgAId,
    `role=${profileC.body?.[0]?.role}`,
  );

  const inviteConsumed = await api("/rest/v1/organization_invites?select=used_by,used_at", { token: tokenA });
  check(
    "the consumed invite is marked as used",
    inviteConsumed.body?.[0]?.used_by === userCId && Boolean(inviteConsumed.body?.[0]?.used_at),
    `used_by=${inviteConsumed.body?.[0]?.used_by === userCId ? "invitee" : "other"}`,
  );

  const replaySignup = await signUpWithInvite(`stockflow.qa.${stamp}.d@mailinator.com`, inviteCode);
  check(
    "an already-used invite code cannot be redeemed again",
    replaySignup.status >= 400 && !replaySignup.body?.access_token,
    `status=${replaySignup.status}`,
  );

  const badInvite = await signUpWithInvite(`stockflow.qa.${stamp}.e@mailinator.com`, `NOPE${stamp}`.toUpperCase());
  check(
    "an unknown invite code is rejected at signup",
    badInvite.status >= 400 && !badInvite.body?.access_token,
    `status=${badInvite.status} msg=${String(badInvite.body?.msg ?? badInvite.body?.message ?? "").slice(0, 48)}`,
  );

  const memberCreatesInvite = await api("/rest/v1/organization_invites", {
    method: "POST",
    token: tokenC,
    body: JSON.stringify({
      organization_id: orgAId,
      code: `MEMBER${stamp}`.toUpperCase(),
      created_by: userCId,
    }),
  });
  check(
    "a member cannot create invite codes",
    memberCreatesInvite.body?.code === "42501" || memberCreatesInvite.status === 403,
    `status=${memberCreatesInvite.status} code=${memberCreatesInvite.body?.code}`,
  );

  const memberDeletesProduct = await api(`/rest/v1/products?id=eq.${productAId}`, {
    method: "DELETE",
    token: tokenC,
    prefer: "return=representation",
  });
  check(
    "a member cannot delete products (owner-only)",
    Array.isArray(memberDeletesProduct.body) && memberDeletesProduct.body.length === 0,
    `affected=${Array.isArray(memberDeletesProduct.body) ? memberDeletesProduct.body.length : "n/a"}`,
  );

  const memberUpdatesRole = await api(`/rest/v1/profiles?id=eq.${userAId}`, {
    method: "PATCH",
    token: tokenC,
    prefer: "return=representation",
    body: JSON.stringify({ role: "owner" }),
  });
  check(
    "a member cannot change roles (owner-only)",
    Array.isArray(memberUpdatesRole.body) && memberUpdatesRole.body.length === 0,
    `affected=${Array.isArray(memberUpdatesRole.body) ? memberUpdatesRole.body.length : "n/a"}`,
  );

  const ownerPromotes = await api(`/rest/v1/profiles?id=eq.${userCId}`, {
    method: "PATCH",
    token: tokenA,
    prefer: "return=representation",
    body: JSON.stringify({ role: "owner" }),
  });
  check(
    "an owner can change a member's role",
    ownerPromotes.status === 200 && ownerPromotes.body?.[0]?.role === "owner",
    `status=${ownerPromotes.status} role=${ownerPromotes.body?.[0]?.role}`,
  );

  // --------------------------------------------------------- Step 4: logout / auth
  const signOut = await api("/auth/v1/logout", { method: "POST", token: tokenB });
  check("logout succeeds", signOut.status === 204 || signOut.status === 200, `status=${signOut.status}`);

  const loginAgain = await api("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: emailB, password: PASSWORD }),
  });
  check("login with the same credentials succeeds", Boolean(loginAgain.body?.access_token), `status=${loginAgain.status}`);

  const badLogin = await api("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: emailB, password: "wrong-password" }),
  });
  check("login with a wrong password fails", badLogin.status >= 400, `status=${badLogin.status}`);

  report();
  console.log(`\nCreated test accounts: ${emailA} , ${emailB} , ${emailC}`);
  console.log("Delete them from Authentication -> Users in the dashboard when you are finished.");

  if (results.some((r) => !r.pass)) process.exit(1);
}

function report() {
  const pad = Math.max(...results.map((r) => r.name.length));
  console.log("\n" + "=".repeat(pad + 16));
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name.padEnd(pad)}  ${r.detail}`);
  }
  const failed = results.filter((r) => !r.pass).length;
  console.log("=".repeat(pad + 16));
  console.log(`${results.length - failed}/${results.length} passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
