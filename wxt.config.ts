import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Dev Mock & Chaos Testing Palette | APITrace',
    description: 'UI stress & chaos testing palette, empty-state simulator, route latency throttle, and frontend API debugging assistant.',
    version: '1.0.0',
    permissions: [
      'storage',
      'activeTab',
      'declarativeNetRequest',
      'scripting'
    ],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Dev Mock & APITrace'
    },
    web_accessible_resources: [
      {
        resources: ['injected.js'],
        matches: ['<all_urls>']
      }
    ]
  }
});

