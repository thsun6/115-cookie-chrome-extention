# 115登录Cookie捕获器（AI生成 Chrome 插件）

> **百分百AI生成，图省事，所有PNG图片均为占位符**

## 项目简介

本项目是一个自用的基于AI生成的 Chrome 插件，旨在通过官网API获取115.com的登录二维码，扫码后自动获取并展示Cookies信息。插件界面简洁，所有代码和界面(包括本readme)均由AI自动生成，极大节省开发时间。

## 主要功能

- 一键获取115.com登录二维码，支持扫码登录，扫码后会自动将cookies复制到剪切板
- 自动捕获并展示当前浏览器中的115.com登录Cookies
- 支持一键复制所有Cookies
- 代码逻辑参考：[ChenyangGao/qrcode_cookie_115](https://gist.github.com/ChenyangGao/d26a592a0aeb13465511c885d5c7ad61)

## 使用说明

1. **开发者模式加载**：
   - 打开 Chrome 浏览器，进入 `chrome://extensions/` 页面。
   - 开启右上角"开发者模式"。
   - 将本项目文件夹整体拖入页面，完成插件加载。
2. **扫码登录**：
   - 点击插件图标，弹出界面。
   - 点击"获取扫码二维码"按钮，使用115 APP扫码。
   - 扫码成功后，插件会自动获取并将Cookies内容复制到剪切板。
   - 可一键复制Cookies

## 注意事项
- 登录二维码依赖115.com官方API
- 本插件仅供个人学习与自用，严禁用于任何商业或非法用途。

## 参考与致谢

- 代码逻辑参考：[ChenyangGao/qrcode_cookie_115](https://gist.github.com/ChenyangGao/d26a592a0aeb13465511c885d5c7ad61)
- 插件完全由AI自动生成，界面与代码均为自动化产物。 
