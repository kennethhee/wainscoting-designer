import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
  const isSingleFile = mode === 'singlefile';
  return {
    base: isSingleFile ? './' : '/wainscoting-designer/',
    plugins: isSingleFile ? [viteSingleFile()] : [],
    build: {
      target: 'es2022',
      sourcemap: !isSingleFile
    }
  };
});
