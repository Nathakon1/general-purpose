import { useEffect, useState } from 'react';

export const go = (path: string) => { location.hash = '#' + path; };
export const back = (fallback = '/') => { if (history.length > 1) history.back(); else go(fallback); };

export function useRoute(): { path: string; query: URLSearchParams } {
  const read = () => {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, q] = raw.split('?');
    return { path, query: new URLSearchParams(q ?? '') };
  };
  const [r, setR] = useState(read);
  useEffect(() => {
    const on = () => { setR(read()); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return r;
}
