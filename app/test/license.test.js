import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { License, licenseConfig, OFFLINE_GRACE_MS } from '../src/license.js';

const DAY = 24 * 60 * 60 * 1000;

/** Polar の代わり。routes[path] が {status, body} を返す（関数なら呼ぶ）。null ならつながらない */
function fakePolar(routes) {
  const calls = [];
  const fetch = async (url, init) => {
    const path = new URL(url).pathname;
    const body = JSON.parse(init.body);
    calls.push({ path, body });
    let r = routes[path];
    if (typeof r === 'function') r = r(body);
    if (r === null) throw new Error('network down');
    return { ok: r.status < 300, status: r.status, text: async () => (r.body ? JSON.stringify(r.body) : '') };
  };
  return { fetch, calls };
}

const ACTIVATED = { status: 200, body: { id: 'act-1', license_key: { display_key: '****-ABCD', expires_at: null } } };

async function setup(routes, { now = () => 1_000_000 } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'redstone-license-'));
  const polar = fakePolar(routes);
  const license = new License({ path: join(dir, 'license.json'), organizationId: 'org-1', api: 'https://polar.test', fetch: polar.fetch, now, label: 'PC1' });
  return { license, polar, dir };
}

test('販売前（組織 ID なし）は使わず、全員が有料版と同じ', () => {
  const license = new License({ path: 'x', organizationId: '' });
  assert.equal(license.status().state, 'disabled');
  assert.equal(license.plan('taro'), 'plus');
  assert.equal(licenseConfig({}).organizationId, '');
  assert.equal(licenseConfig({ REDSTONE_POLAR_ORG: 'o' }).api, 'https://sandbox-api.polar.sh', '開発中はテスト環境');
});

test('キーを有効にすると、その TikTok アカウントでだけ有料版になる', async () => {
  const { license, polar, dir } = await setup({ '/v1/customer-portal/license-keys/activate': ACTIVATED });
  assert.equal(license.plan('taro'), 'free', 'キーがなければ無料版');
  await assert.rejects(license.activate('KEY', ''), /先に TikTok ID/);
  await license.activate(' KEY ', '@Taro');
  assert.deepEqual(polar.calls[0].body, { key: 'KEY', organization_id: 'org-1', label: 'PC1', conditions: { tiktok: 'taro' } });
  assert.equal(license.status().state, 'active');
  assert.equal(license.plan('taro'), 'plus');
  assert.equal(license.plan('@TARO'), 'plus', '@ や大文字小文字は気にしない');
  assert.equal(license.plan('hanako'), 'free', '別のアカウントでは無料版');
  const saved = JSON.parse(await readFile(join(dir, 'license.json'), 'utf8'));
  assert.equal(saved.activationId, 'act-1');
});

test('有効にできないときは理由を返す（見つからない・使える PC の数を超えた）', async () => {
  const notFound = await setup({ '/v1/customer-portal/license-keys/activate': { status: 404 } });
  await assert.rejects(notFound.license.activate('BAD', 'taro'), /見つかりません/);
  const limit = await setup({ '/v1/customer-portal/license-keys/activate': { status: 403, body: { detail: 'limit reached' } } });
  await assert.rejects(limit.license.activate('KEY', 'taro'), /PC の数を超えて/);
  assert.equal(limit.license.status().state, 'none');
});

test('ネットにつながらないときは、最後に確かめてから7日間は有料版のまま', async () => {
  let time = 1_000_000;
  const routes = { '/v1/customer-portal/license-keys/activate': ACTIVATED, '/v1/customer-portal/license-keys/validate': null };
  const { license } = await setup(routes, { now: () => time });
  await license.activate('KEY', 'taro');
  time += 3 * DAY;
  await license.check();
  assert.equal(license.status().state, 'offline');
  assert.equal(license.plan('taro'), 'plus');
  time = 1_000_000 + OFFLINE_GRACE_MS + 1;
  assert.equal(license.status().state, 'expired');
  assert.equal(license.plan('taro'), 'free');
  // つながったら戻る
  routes['/v1/customer-portal/license-keys/validate'] = { status: 200, body: { expires_at: null } };
  await license.check();
  assert.equal(license.status().state, 'active');
});

test('解約・期限切れ（Polar が 404）なら無料版に戻る。確かめるときも TikTok ID の条件を送る', async () => {
  const { license, polar } = await setup({
    '/v1/customer-portal/license-keys/activate': ACTIVATED,
    '/v1/customer-portal/license-keys/validate': { status: 404 },
  });
  await license.activate('KEY', 'taro');
  await license.check();
  assert.equal(polar.calls[1].body.conditions.tiktok, 'taro');
  assert.equal(polar.calls[1].body.activation_id, 'act-1');
  assert.equal(license.status().state, 'expired');
  assert.equal(license.plan('taro'), 'free');
});

test('期限の日時を過ぎたら、確かめる前でも無料版', async () => {
  let time = 1_000_000;
  const { license } = await setup({ '/v1/customer-portal/license-keys/activate': { status: 200, body: { id: 'a', license_key: { expires_at: new Date(time + DAY).toISOString() } } } }, { now: () => time });
  await license.activate('KEY', 'taro');
  assert.equal(license.plan('taro'), 'plus');
  time += 2 * DAY;
  assert.equal(license.plan('taro'), 'free');
});

test('解除すると Polar に知らせ、Polar に届かなくてもこの PC の記録は消す', async () => {
  const { license, polar } = await setup({ '/v1/customer-portal/license-keys/activate': ACTIVATED, '/v1/customer-portal/license-keys/deactivate': null });
  await license.activate('KEY', 'taro');
  await license.deactivate();
  assert.equal(polar.calls.at(-1).path, '/v1/customer-portal/license-keys/deactivate');
  assert.equal(license.status().state, 'none');
  await license.load();
  assert.equal(license.status().state, 'none', 'ファイルも消えている');
});

test('購入ページ・契約のページは、販売を始めたら画面に出す。https のページだけ', () => {
  const license = new License({ path: 'x', organizationId: 'org', checkoutUrl: 'https://buy.polar.sh/polar_cl_x', portalUrl: 'javascript:alert(1)' });
  assert.deepEqual(license.status(), { enabled: true, state: 'none', checkoutUrl: 'https://buy.polar.sh/polar_cl_x', portalUrl: '' });
  assert.deepEqual(new License({ path: 'x', organizationId: '' , checkoutUrl: 'https://x' }).status(), { enabled: false, state: 'disabled' }, '販売前は出さない');
  assert.equal(licenseConfig({ REDSTONE_POLAR_ORG: 'o', REDSTONE_POLAR_CHECKOUT: 'https://sandbox.polar.sh/x' }).checkoutUrl, 'https://sandbox.polar.sh/x');
});
