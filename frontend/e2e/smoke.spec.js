import { expect, test } from '@playwright/test';

const subscriptionPath = 'smoke-test';
const subscriptionName = 'Smoke Test';
const nodeName = 'Smoke Node';
const nodeContent = 'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ@example.com:8388#Smoke%20Node';

async function fillElementPlusInput(page, testId, value) {
  const root = page.getByTestId(testId);
  const isInput = await root.evaluate((el) => ['INPUT', 'TEXTAREA'].includes(el.tagName));
  const input = isInput ? root : root.locator('input, textarea');
  await input.fill(value);
}

test.describe('application smoke flow', () => {
  test('logs in, creates a subscription and publishes client URLs', async ({ page, request }) => {
    await page.goto('/');

    await fillElementPlusInput(page, 'login-username', 'admin');
    await fillElementPlusInput(page, 'login-password', 'admin');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('dashboard')).toBeVisible();

    await page.getByTestId('add-subscription').click();
    await fillElementPlusInput(page, 'subscription-name', subscriptionName);
    await fillElementPlusInput(page, 'subscription-path', subscriptionPath);
    await page.getByTestId('create-subscription').click();

    const subscriptionCard = page.getByTestId(`subscription-card-${subscriptionPath}`);
    await expect(subscriptionCard).toBeVisible();
    await expect(subscriptionCard).toContainText(subscriptionName);

    await page.getByTestId(`add-node-${subscriptionPath}`).click();
    await fillElementPlusInput(page, 'node-name', nodeName);
    await fillElementPlusInput(page, 'node-content', nodeContent);
    await page.getByTestId('create-node').click();

    await expect(subscriptionCard).toContainText('1');
    await page.getByTestId(`toggle-nodes-${subscriptionPath}`).click();
    await expect(subscriptionCard).toContainText(nodeName);
    await expect(subscriptionCard).toContainText('ss://');

    for (const path of [`/${subscriptionPath}`, `/${subscriptionPath}/surge`, `/${subscriptionPath}/clash`]) {
      const response = await request.get(path);
      expect(response.ok(), `${path} should be reachable`).toBe(true);
      expect(await response.text(), `${path} should not be empty`).toContain('Smoke');
    }

    const v2rayResponse = await request.get(`/${subscriptionPath}/v2ray`);
    expect(v2rayResponse.ok(), '/v2ray should be reachable').toBe(true);
    const decodedV2ray = Buffer.from(await v2rayResponse.text(), 'base64').toString('utf8');
    expect(decodedV2ray).toContain('Smoke');
  });
});
