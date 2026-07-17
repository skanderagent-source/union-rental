import { Outlet } from 'react-router-dom';

export function MainLayout() {
  return (
    <main id="main-content">
      <Outlet />
    </main>
  );
}
