import { extname } from 'path';

export function ensureExtension(filename: string, extension: string) {
    if (extname(filename) !== extension) {
        if (filename.endsWith('.')) {
            filename = filename + extension.replace('.','');
        } else {
            filename = filename + extension;
        }
    }
    return filename;
}