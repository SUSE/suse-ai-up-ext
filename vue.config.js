const config = require('@rancher/shell/vue.config'); // eslint-disable-line @typescript-eslint/no-var-requires

module.exports = config(__dirname, {
  excludes: [],
  // excludes: ['fleet', 'example']
}, {
  // Add proxy configuration for MCP Gateway API to avoid CORS issues
  devServer: {
    proxy: {
      '/api/mcp': {
        target: 'http://localhost:8911',
        changeOrigin: true,
        pathRewrite: {
          '^/api/mcp': '/api/v1'
        }
      },
      '/api/virtual-mcp': {
        target: 'http://localhost:8911',
        changeOrigin: true,
        pathRewrite: {
          '^/api/virtual-mcp': '/api/v1'
        }
      }
    }
  }
});
