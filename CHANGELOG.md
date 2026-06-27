# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.4] - 2026-06-27

### Added
- Rebuild admin UI with Vue 3 + Vite + Element Plus (frontend/backend split)
- Protocol guide page, i18n (zh-CN / en), and dark mode theme
- `make dev` one-command local development (frontend + backend, port precheck from `.env`)
- Clash preview: full config display, file size hint, and YAML download
- `PUBLIC_BASE_URL` support for remote Subconverter to fetch subscriptions over the public internet
- Node list drag-and-drop sorting (table and card views) via SortableJS
- GitHub template URLs auto-convert to `raw.githubusercontent.com` for Subconverter

### Changed
- Subscription client links point to backend origin in dev (fixes wrong port on Vite proxy)
- Subconverter integration: pass universal node links with `|` separator (fixes single-node / empty-node conversion)
- Node table layout: protocol tag before name, name/link columns at 1:1 width, operations column with spacing
- Operations column header renamed from「编辑」to「操作」; table view uses drag handle instead of up/down buttons
- Docker / Makefile / README updated for new project structure

### Fixed
- Clash preview and `/path/clash` subscription failing with「No nodes were found」on local or multi-node setups
- Clash preview truncated to 8KB (now shows complete config)
- Node API missing `type` field (protocol tags showed `unknown`)
- Operation buttons wrapping or clipped off-screen on narrow viewports
- Backend startup crash from duplicate `buildSubconvertApiUrl` import
- Subconverter preview using wrong subscription path; HTTP client supports `http://` endpoints
- Import network errors and duplicate toast notifications

---

## [1.0.3] - 2026-04-11

### Changed
- Update github username in README.md and README_ZH.md
- Update preview link in README.md and README_ZH.md

### Added
- Add github link in pages

---

## [1.0.2] - 2026-03-13

### Fixed
- Fix i18n incorrect

---

## [1.0.1] - 2026-02-26

### Added
- Optimized UI, added dark mode, card view for node list, added hover highlights
- Add example link for custom template URL
- Add project link for Subconverter API URL

### Changed
- UI/UX improvements

### Fixed
- Fixed subscription creation error issue
- Fixed many other bugs

### Known Issues
- Wrote some bugs (author's note)

### Notes
- Coding with Codex or Claude is the way to go, others are trash (author's note)

---

## [1.0.0] - 2025-XX-XX

### Added
- Initial release
- Support importing nodes via subscription link
- Support configuring Subconverter + custom template or default template to generate Clash subscription nodes
- UI updates
- Code refactoring

### Features
- Multi-protocol support: SS, VMess, Trojan, VLESS, SOCKS5, Snell, Hysteria2, Tuic
- Subscription management: Create multiple subscriptions, custom paths, bulk import, drag-and-drop sorting
- Multiple subscription formats: Raw, Base64, Surge, Clash, Shadowsocks
- Advanced Clash features: Built-in default template (3900+ rules), automatic rule-provider expansion, compatible with ClashMeta and ClashX
- Security features: Admin login authentication, session management, secure cookies
- Interface design: Responsive design, mobile-friendly

---

[1.0.4]: https://github.com/baixiaoshengofficial/SubscribeManager/compare/tag/v1.0.3...tag/v1.0.4
[1.0.3]: https://github.com/baixiaoshengofficial/SubscribeManager/compare/tag/v1.0.2...tag/v1.0.3
[1.0.2]: https://github.com/baixiaoshengofficial/SubscribeManager/compare/tag/v1.0.1...tag/v1.0.2
[1.0.1]: https://github.com/baixiaoshengofficial/SubscribeManager/compare/tag/v1.0.0...tag/v1.0.1
[1.0.0]: https://github.com/baixiaoshengofficial/SubscribeManager/releases/tag/v1.0.0
