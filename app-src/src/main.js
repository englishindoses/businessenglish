import './styles/app.css';

import { route, fallback, start, navigate } from './lib/router.js';
import { mountShell, focusScreen } from './ui/shell.js';
import { el } from './lib/dom.js';

import homeScreen from './screens/home.js';
import topicsScreen from './screens/topics.js';
import activitiesScreen from './screens/activities.js';
import sessionScreen from './screens/session.js';
import reviewScreen from './screens/review.js';
import questionsScreen from './screens/questions.js';
import settingsScreen from './screens/settings.js';

mountShell(document.getElementById('app'));

/** Wrap a screen so focus lands sensibly after every navigation. */
const screen = (render) => (params) => {
  render(params);
  focusScreen();
};

route('/', screen(homeScreen));
route('/topics', screen(topicsScreen));
route('/topic/:id', screen(activitiesScreen));
route('/practice/:id/:type', screen((p) => sessionScreen({ ...p, mode: 'new' })));
route('/practice/:id/:type/replay', screen((p) => sessionScreen({ ...p, mode: 'replay' })));
route('/review', screen(reviewScreen));
route('/questions', screen(questionsScreen));
route('/settings', screen(settingsScreen));
fallback(() => navigate('/', { replace: true }));

start();

// ---------------------------------------------------------------------------
// Offline support. A new version never reloads the page underneath a student
// mid-round — they get a bar and decide when to take it.
// ---------------------------------------------------------------------------

if (import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        showUpdateBar(() => updateSW(true));
      },
    });
  });
}

function showUpdateBar(onUpdate) {
  if (document.querySelector('.update-bar')) return;

  const bar = el('div', { class: 'update-bar', role: 'status' }, [
    el('span', { text: 'A new version is ready.' }),
    el('button', {
      type: 'button',
      class: 'btn',
      text: 'Update',
      onClick: onUpdate,
    }),
  ]);
  document.body.append(bar);
}
