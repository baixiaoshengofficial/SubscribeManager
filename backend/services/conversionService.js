/**
 * 转换服务 - 统一管理订阅格式转换逻辑
 */
const { convertSubscription } = require('../utils/converters/subscriptionConverter');
const { buildSubconvertApiUrl, normalizeTemplateUrl, resolveSubconvertDirectUrl, getPublicBaseUrl } = require('../utils/converters/urlHandler');
const { fetchUrl } = require('../utils/httpClient');
const { filterSnellNodes } = require('../utils');
const logger = require('../utils/logger');
const subscriptionService = require('./subscriptionService');
const ApiError = require('../utils/ApiError');

class ConversionService {
  /**
   * 转换订阅内容到指定格式
   * @param {string} content 订阅内容（通用格式的节点链接）
   * @param {string} format 目标格式 ('clash', 'surge', 'shadowsocks')
   * @param {Object} options 转换选项
   * @param {string} options.customTemplate 自定义模板或模板 URL
   * @param {string} options.subconvertUrl Subconvert API URL
   * @param {string} options.subscriptionUrl 当前订阅的 URL
   * @param {boolean} options.useDefaultTemplate 是否使用默认模板（优先级最高）
   * @returns {Promise<string>} 转换后的内容
   */
  async convert(content, format, options = {}) {
    const {
      customTemplate = null,
      subconvertUrl = null,
      subscriptionUrl = null,
      realBaseUrl = null,  // 新增：真实的 baseUrl
      useDefaultTemplate = null
    } = options;

    // 空内容处理
    if (!content?.trim()) {
      return format === 'clash' ? await this._getEmptyClashConfig() : '';
    }

    // 如果配置了 Subconvert URL，使用 Subconvert API（优先级最高）
    if (subconvertUrl?.trim()) {
      return await this._convertViaSubconvert(content, format, customTemplate, subconvertUrl, subscriptionUrl, realBaseUrl);
    }

    // 没有配置 Subconvert URL，根据 checkbox 决定模板类型
    const useDefault = useDefaultTemplate !== false; // null 或 true 都使用默认模板，false 使用仅节点

    if (useDefault) {
      // 使用默认完整模板（含规则）
      return await this._convertLocally(content, format, null);
    } else {
      // 使用仅节点模板（不含规则）
      return await this._convertLocally(content, format, await this._getSimpleTemplateOnlyNodes());
    }
  }

  async generateClashPreview({ subconvertUrl, templateUrl, subscriptionPath, requestBaseUrl }) {
    if (!subconvertUrl?.trim()) {
      throw new ApiError(400, 'subconverter.subconvert_url_required');
    }
    if (!subscriptionPath?.trim()) {
      throw new ApiError(400, 'subscription.not_found');
    }

    const subscriptionData = await subscriptionService.generateSubscriptionContent(subscriptionPath.trim());
    if (!subscriptionData) {
      throw new ApiError(404, 'subscription.not_found');
    }

    const publicBase = getPublicBaseUrl(requestBaseUrl);
    const subscriptionSourceUrl = `${publicBase}/${subscriptionPath.trim()}`;
    const nodeContent = filterSnellNodes(subscriptionData.nodes);
    const directUrl = resolveSubconvertDirectUrl(subscriptionSourceUrl, nodeContent);

    const config = await this._callSubconvertApi(
      subconvertUrl.trim(),
      null,
      'clash',
      normalizeTemplateUrl(templateUrl),
      directUrl
    );

    return {
      config,
      length: config.length
    };
  }

  /**
   * 通过 Subconvert API 转换
   * @private
   */
  async _convertViaSubconvert(content, format, customTemplate, subconvertUrl, subscriptionUrl, realBaseUrl) {
    try {
      // 公网可访问的通用链接订阅 URL，供 Subconverter 拉取
      let subscriptionSourceUrl = null;
      if (subscriptionUrl) {
        try {
          const urlObj = new URL(subscriptionUrl);
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          if (pathParts.length >= 1) {
            const subscriptionPath = pathParts[0];
            const publicBase = getPublicBaseUrl(realBaseUrl);
            subscriptionSourceUrl = `${publicBase}/${subscriptionPath}`;
          }
        } catch (e) {
          logger.debug('Failed to parse subscription URL', { message: e.message });
        }
      }

      const templateUrl = this._isTemplateUrl(customTemplate)
        ? normalizeTemplateUrl(customTemplate)
        : null;
      const directUrl = resolveSubconvertDirectUrl(subscriptionSourceUrl, filterSnellNodes(content));

      const convertedContent = await this._callSubconvertApi(
        subconvertUrl,
        null,
        format,
        templateUrl,
        directUrl
      );

      return convertedContent;
    } catch (error) {
      logger.warn('Subconvert conversion failed, falling back to local conversion', { message: error.message });
      // 降级时，使用默认完整模板
      return await this._convertLocally(content, format, null);
    }
  }

  /**
   * 直接调用 Subconvert API
   * @private
   */
  async _callSubconvertApi(subconvertUrl, subscriptionUrl, format, customTemplateUrl, directUrl = null) {
    const fullUrl = buildSubconvertApiUrl(subconvertUrl, subscriptionUrl, format, customTemplateUrl, directUrl);
    logger.debug('Subconvert API request URL', { url: fullUrl });
    return fetchUrl(fullUrl);
  }

  /**
   * 本地转换
   * @param {string} content 订阅内容
   * @param {string} format 目标格式
   * @param {string|null} templateUrl 模板 URL 或 null（使用默认模板）
   * @private
   */
  async _convertLocally(content, format, templateUrl = null) {
    return await convertSubscription(content, format, templateUrl, null, null);
  }

  /**
   * 获取仅包含节点的简单模板
   * @private
   */
  async _getSimpleTemplateOnlyNodes() {
    // 使用一个空的模板，只返回节点，不包含规则
    return `# Clash 配置文件 - 仅节点（无规则）
# 生成时间: ${new Date().toISOString()}

proxies:
{{proxies}}

proxy-groups:
  - name: 节点选择
    type: select
    proxies: [{{proxy_names_comma}}]
`;
  }

  /**
   * 检查是否为模板 URL
   * @private
   */
  _isTemplateUrl(template) {
    return template && (template.startsWith('http://') || template.startsWith('https://'));
  }

  /**
   * 获取仅节点的订阅内容
   * @param {string} content 订阅内容
   * @param {string} format 目标格式
   * @returns {Promise<string>} 仅节点的配置内容
   */
  async getNodesOnly(content, format) {
    if (format !== 'clash') {
      // 非 Clash 格式，直接返回原始内容
      return content;
    }

    // Clash 格式，返回仅节点配置
    return await this._convertLocally(content, format, await this._getSimpleTemplateOnlyNodes());
  }

  /**
   * 获取空的 Clash 配置
   * @private
   */
  async _getEmptyClashConfig() {
    const clashGenerator = require('../utils/converters/clashGenerator');
    return clashGenerator.generateEmptyConfig();
  }
}

module.exports = {
  ConversionService
};
