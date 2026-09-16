import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.resolve(
  __dirname,
  '../node_modules/react-native-google-mobile-ads/src/specs/modules/NativeAppModule.ts'
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  if (content.includes('CodegenTypes.UnsafeObject') || content.includes("type { CodegenTypes } from 'react-native'")) {
    content = content.replace(
      "import type { CodegenTypes } from 'react-native';",
      "import { UnsafeObject } from 'react-native/Libraries/Types/CodegenTypes';"
    );
    content = content.replace(/CodegenTypes\.UnsafeObject/g, 'UnsafeObject');
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[postinstall] Successfully patched react-native-google-mobile-ads NativeAppModule.ts for RN 0.79 New Architecture.');
  }
}
