import http from 'node:http';
import { expect, test } from '@playwright/test';

const subscriptionPath = 'smoke-test';
const subscriptionName = 'Smoke Test';
const nodeName = 'Smoke Node';
const nodeContent = 'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ@example.com:8388#Smoke%20Node';
const manualNodeContent = 'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ@manual.example.com:8388#Manual%20Node';
let providerServer;
let providerUrl;

async function fillElementPlusInput(page, testId, value) {
  const root = page.getByTestId(testId);
  const isInput = await root.evaluate((el) => ['INPUT', 'TEXTAREA'].includes(el.tagName));
  const input = isInput ? root : root.locator('input, textarea');
  await input.fill(value);
}

test.describe('application smoke flow', () => {
  test.beforeAll(async () => {
    providerServer = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end([
        nodeContent,
        'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ@airport.example.com:8388#Airport%20Node'
      ].join('\n'));
    });
    await new Promise((resolve) => providerServer.listen(0, '127.0.0.1', resolve));
    const address = providerServer.address();
    providerUrl = `http://127.0.0.1:${address.port}/subscription?token=e2e-only`;
  });

  test.afterAll(async () => {
    await new Promise((resolve, reject) => providerServer.close((error) => error ? reject(error) : resolve()));
  });

  test('logs in, creates a subscription and publishes client URLs', async ({ page, request, context }) => {
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
    await fillElementPlusInput(page, 'node-content', nodeContent);
    await page.getByTestId('create-node').click();

    await expect(subscriptionCard).toContainText('1');

    await page.getByTestId(`add-node-${subscriptionPath}`).click();
    await fillElementPlusInput(page, 'node-content', manualNodeContent);
    await page.getByTestId('create-node').click();
    await expect(subscriptionCard).toContainText('2');

    await page.getByTestId(`import-nodes-${subscriptionPath}`).click();
    await fillElementPlusInput(page, 'import-urls', providerUrl);
    await page.getByTestId('import-submit').click();
    await expect(page.getByTestId('import-result')).toBeVisible();
    await page.getByTestId('import-close').click();

    await page.getByTestId(`toggle-nodes-${subscriptionPath}`).click();
    await expect(subscriptionCard).toContainText(nodeName);
    await expect(subscriptionCard).toContainText('ss://');
    await expect(subscriptionCard).toContainText('127.0.0.1');
    await page.getByTestId(`card-nodes-${subscriptionPath}`).click();
    await expect(subscriptionCard.getByTestId('node-group-heading')).toHaveCount(2);

    await page.getByTestId(`flat-nodes-${subscriptionPath}`).click();
    await expect(page.getByTestId(`flat-nodes-${subscriptionPath}`)).toHaveClass(/is-active/);
    await page.getByTestId(`grouped-nodes-${subscriptionPath}`).click();
    await expect(page.getByTestId(`grouped-nodes-${subscriptionPath}`)).toHaveClass(/is-active/);

    const nodesResponse = await context.request.get(`/api/subscriptions/${subscriptionPath}/nodes`);
    const nodesBody = await nodesResponse.json();
    expect(nodesBody.data).toHaveLength(3);
    expect(nodesBody.data.filter((node) => node.source_name === '127.0.0.1')).toHaveLength(2);
    expect(nodesBody.data.filter((node) => !node.source_name)).toHaveLength(1);
    expect(nodesBody.data.every((node) => !Object.hasOwn(node, 'source_url'))).toBe(true);

    const smokeNode = nodesBody.data.find((node) => node.name === nodeName);
    await page.getByTestId(`edit-node-${smokeNode.id}`).click();
    await fillElementPlusInput(page, 'edit-node-name', 'Renamed Smoke Node');
    await page.getByTestId('update-node').click();
    await expect(subscriptionCard).toContainText('Renamed Smoke Node');

    const renamedNodesResponse = await context.request.get(`/api/subscriptions/${subscriptionPath}/nodes`);
    const renamedNodesBody = await renamedNodesResponse.json();
    const renamedNode = renamedNodesBody.data.find((node) => node.id === smokeNode.id);
    expect(renamedNode.name).toBe('Renamed Smoke Node');
    expect(renamedNode.original_link).toContain('#Renamed%20Smoke%20Node');

    for (const path of [`/${subscriptionPath}`, `/${subscriptionPath}/surge`, `/${subscriptionPath}/clash`]) {
      const response = await request.get(path);
      expect(response.ok(), `${path} should be reachable`).toBe(true);
      expect(await response.text(), `${path} should not be empty`).toContain('Smoke');
    }

    const v2rayResponse = await request.get(`/${subscriptionPath}/v2ray`);
    expect(v2rayResponse.ok(), '/v2ray should be reachable').toBe(true);
    const decodedV2ray = Buffer.from(await v2rayResponse.text(), 'base64').toString('utf8');
    expect(decodedV2ray).toContain('Smoke');

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileLayout = await subscriptionCard.evaluate((card) => {
      const measure = (selector) => {
        const element = card.querySelector(selector);
        const bounds = element.getBoundingClientRect();
        return {
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          childrenInside: Array.from(element.children).every((child) => {
            const childBounds = child.getBoundingClientRect();
            return childBounds.left >= bounds.left - 1 && childBounds.right <= bounds.right + 1;
          })
        };
      };
      return {
        actions: measure('.sub-actions'),
        nodeTools: measure('.node-list-tools')
      };
    });

    expect(mobileLayout.actions.scrollWidth).toBeLessThanOrEqual(mobileLayout.actions.clientWidth);
    expect(mobileLayout.actions.childrenInside).toBe(true);
    expect(mobileLayout.nodeTools.scrollWidth).toBeLessThanOrEqual(mobileLayout.nodeTools.clientWidth);
    expect(mobileLayout.nodeTools.childrenInside).toBe(true);
    const pageActionsLayout = await page.locator('.page-actions').evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        childrenInside: Array.from(element.children).every((child) => {
          const childBounds = child.getBoundingClientRect();
          return childBounds.left >= bounds.left - 1 && childBounds.right <= bounds.right + 1;
        })
      };
    });
    expect(pageActionsLayout.scrollWidth).toBeLessThanOrEqual(pageActionsLayout.clientWidth);
    expect(pageActionsLayout.childrenInside).toBe(true);
  });

  test('enables browser credential autocomplete only for trusted origins', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('login-username')).toHaveAttribute('autocomplete', 'username');
    await expect(page.getByTestId('login-password')).toHaveAttribute('autocomplete', 'current-password');
  });
});
