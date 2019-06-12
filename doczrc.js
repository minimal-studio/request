import doczPluginNetlify from "docz-plugin-netlify";
import { css } from 'docz-plugin-css';
import themeConfig from './docz/theme-config/config';

export default {
  // dest: 'docz-dist',
  title: 'Uke Request',
  description: '通讯加密库',
  indexHtml: 'docz/index.html',
  wrapper: 'docz/wrapper',
  codeSandbox: false,
  hashRouter: true,
  typescript: true,
  files: '**/*.mdx',
  htmlContext: {
    head: {
      links: [{
        rel: 'stylesheet',
        // href: 'https://codemirror.net/theme/dracula.css'
        href: 'https://codemirror.net/theme/mdn-like.css'
      }],
    },
  },
  themeConfig,
  menu: [
    'Getting Started / 开始',
    'Request / 异步请求',
    'URL Resolver / URL解析器',
  ],
  // modifyBundlerConfig: (config) => {
  //   config.resolve.extensions.push('.scss');
  //   config.module.rules.push({
  //     test: /\.scss$/,
  //     use: ["style-loader", "css-loader", "sass-loader"]
  //   });
  //   return config;
  // },
  plugins: [
    doczPluginNetlify(),
    css({
      preprocessor: 'sass',
    })
  ]
};
