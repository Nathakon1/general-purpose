import { useEffect, useState } from 'react';
import { getSetting } from './db/repo';
import { useRoute } from './router';
import { BottomNav, ToastHost } from './components/ui';
import { Home } from './screens/Home';
import { Import } from './screens/Import';
import { TxForm } from './screens/TxForm';
import { Summary } from './screens/Summary';
import { Settings } from './screens/Settings';
import { Categories } from './screens/Categories';
import { Onboarding } from './screens/Onboarding';

export function App() {
  const { path, query } = useRoute();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    getSetting('onboarded', false).then(setOnboarded);
    getSetting<string>('theme', 'system').then((t) => { if (t !== 'system') document.documentElement.dataset.theme = t; });
  }, []);

  if (onboarded === null) return null;
  if (!onboarded && !query.has('shared')) return <Onboarding onDone={() => setOnboarded(true)} />;

  let screen;
  const tx = path.match(/^\/t\/(\d+)$/);
  if (path === '/') screen = <Home />;
  else if (path === '/import') screen = <Import shared={query.has('shared')} />;
  else if (path === '/new') screen = <TxForm key="new" />;
  else if (tx) screen = <TxForm key={tx[1]} id={+tx[1]} />;
  else if (path === '/summary') screen = <Summary />;
  else if (path === '/settings') screen = <Settings />;
  else if (path === '/settings/categories') screen = <Categories />;
  else screen = <div className="empty"><p>ไม่พบหน้านี้</p><a href="#/">กลับหน้าหลัก</a></div>;

  return (
    <>
      <main className="shell">{screen}</main>
      <BottomNav path={path} />
      <ToastHost />
    </>
  );
}
