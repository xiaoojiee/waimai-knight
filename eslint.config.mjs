import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser },
    },
    rules: {
      // 允许空的 catch(加载失败静默回退的场景)
      'no-empty': ['error', { allowEmptyCatch: true }],
      // 顶层声明跨文件共享(经典 script 拆分), 只检查函数局部变量;
      // 以下划线开头的未使用参数(如 catch (_))不报错
      'no-unused-vars': [
        'error',
        { vars: 'local', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];
