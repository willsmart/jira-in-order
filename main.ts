enum Stage {
  todo = 'Todo',
  dev = 'Dev',
  review = 'Review',
  qa = 'QA',
  done = 'Done',
}

enum Platform {
  ios = 'iOS',
  web = 'Web',
  android = 'Android',
  infrastructure = 'Infrastructure',
  www = 'www',
  none = 'None',
}

enum Requires {
  review = 'Review',
  qa = 'QA',
  deployment = 'Deployment',
}

function requiresForColor(rgb: string): Requires | undefined {
  switch (rgb2hex(rgb)) {
    case '#03df87':
      return Requires.deployment;
    case '#51cae8':
      return Requires.qa;
    case '#ffcd03':
      return Requires.review;
  }
  return undefined;

  function rgb2hex(rgb: string): string {
    const { red = 0, green = 0, blue = 0 } =
      rgb.match(/^\s*rgb\((?<red>\d+(?:\.\d+)?),\s*(?<green>\d+(?:\.\d+)?),\s*(?<blue>\d+(?:\.\d+)?)\)\s*$/)?.groups ||
      {};
    return '#' + hex(+red) + hex(+green) + hex(+blue);

    function hex(value: number): string {
      return value
        .toString(16)
        .padStart(2, '0')
        .slice(-2);
    }
  }
}

type Card = {
  el: Element;
  requires: Requires | undefined;
  githubState: string | undefined;
  key: string;
  link: string;
  title: string;
  assignee: string | undefined;
  mine: boolean;
  flagged: boolean;
  stage: Stage;
  components: Set<String>;
  platforms: Set<Platform>;
};

type PrioritizedCard = Card & {
  priority: number;
  priorityOrdinal?: number;
  tasks?: Set<Task>;
};

function refreshTaskOverlay(card: PrioritizedCard): void {
  const { el, priorityOrdinal, tasks } = card;
  let maybeOverlayEl = el.getElementsByClassName('task-overlay').item(0);
  if (priorityOrdinal === undefined || tasks === undefined) {
    maybeOverlayEl?.parentElement?.removeChild(maybeOverlayEl);
    return;
  }

  let overlayEl: Element;
  if (maybeOverlayEl) overlayEl = maybeOverlayEl;
  else {
    overlayEl = document.createElement('DIV');
    el.appendChild(overlayEl);
    overlayEl.innerHTML = `<div class=ordinal></div><ul class=tasks></ul>`;
    overlayEl.className = 'task-overlay';
  }

  [...Array(10)].forEach((_, index) => {
    overlayEl.classList.toggle(`ordinal-${index + 1}`, index + 1 == Math.min(priorityOrdinal, 10));
  });

  const ordinalEl = overlayEl.getElementsByClassName('ordinal').item(0),
    tasksEl = overlayEl.getElementsByClassName('tasks').item(0);

  if (!ordinalEl || !tasksEl) return;

  ordinalEl.textContent = String(priorityOrdinal);
  tasksEl.innerHTML = [...tasks.values()]
    .sort()
    .map(task => `<li>${taskTitle({ task, card })}</li>`)
    .join('');
}

const g_allCards: PrioritizedCard[] = [];
Object.defineProperty(window, 'allCards', { value: g_allCards });

function scrapeCards(): PrioritizedCard[] {
  const colsEl = document.getElementsByClassName('ghx-columns').item(0);
  if (!colsEl) return [];

  const colStages = [Stage.todo, Stage.dev, Stage.review, Stage.qa, Stage.done],
    colEls = Array.from(colsEl.children);

  let cards: Card[] = [];
  for (const cardEl of Array.from(document.getElementsByClassName('ghx-issue'))) {
    const colEl = cardEl.parentElement?.parentElement,
      keyEl = cardEl.getElementsByClassName('ghx-key').item(0),
      grabberEl = <HTMLElement>cardEl.getElementsByClassName('ghx-grabber').item(0),
      assigneeEl = cardEl.getElementsByClassName('ghx-avatar-img').item(0),
      githubStateEl = cardEl.querySelector('.fusion-widget[data-dev-type=pullrequest]'),
      summaryEl = cardEl.getElementsByClassName('ghx-summary').item(0),
      extraFieldEls = Array.from(cardEl.querySelectorAll('.ghx-extra-field[data-tooltip]')),
      link = keyEl?.getAttribute('href'),
      key = keyEl?.textContent,
      githubState = githubStateEl?.textContent?.toLowerCase() || undefined,
      title = summaryEl?.getAttribute('title');

    if (!colEl || !key || !link || !title || !grabberEl) continue;

    const stage = colStages[colEls.indexOf(colEl)];
    if (!stage) continue;

    const { assignee } =
        /^Assignee: (?<assignee>.*)$/.exec((assigneeEl && assigneeEl.getAttribute('alt')) || '')?.groups || {},
      components = new Set<string>(
        extraFieldEls
          .map(el => <string>el.getAttribute('data-tooltip'))
          .find(tt => tt.startsWith('Components: '))
          ?.substring('Components: '.length)
          .split(/,\s*/g) || []
      );

    cards.push({
      el: cardEl,
      requires: requiresForColor(grabberEl.style.backgroundColor),
      githubState,
      key,
      link,
      title,
      assignee,
      mine: assignee == 'Will Smart',
      flagged: cardEl.classList.contains('ghx-flagged'),
      stage,
      components,
      platforms: new Set<Platform>(
        <Platform[]>(
          [
            components.has('iOS App') ? Platform.ios : undefined,
            components.has('Android App') ? Platform.android : undefined,
            components.has('Rails') || components.has('Web Frontend') ? Platform.web : undefined,
            components.has('Public Website') ? Platform.www : undefined,
            components.has('Infrastructure') ? Platform.infrastructure : undefined,
            components.has('None') ? Platform.none : undefined,
          ].filter(p => p)
        )
      ),
    });
  }

  const prioritizedCards = cards
    .map(card => prioritizedCard({ card, cards }))
    .sort(({ priority: a }, { priority: b }) => b - a);

  let ordinal = 1;
  prioritizedCards
    .filter(({ priority }) => priority)
    .forEach((card, cardIndex, cards) => {
      if (cardIndex && card.priority < cards[cardIndex - 1].priority) ordinal++;
      card.priorityOrdinal = ordinal;
    });

  prioritizedCards.forEach(refreshTaskOverlay);

  g_allCards.splice(0, g_allCards.length, ...prioritizedCards);
  return prioritizedCards;
}

setTimeout(scrapeCards, 1000);

let lastMouseMoveAt = 0,
  mousePos = { x: 0, y: 0 };

document.addEventListener('keydown', event => {
  const { ctrlKey } = event;
  if (ctrlKey) {
    scrapeCards();
    document.body.style.transformOrigin = `${mousePos.x}px ${mousePos.y}px`;
    document.body.classList.add('show-task-overlays');
  }
});

document.addEventListener('keyup', event => {
  const { ctrlKey } = event;
  if (!ctrlKey) {
    document.body.classList.remove('show-task-overlays');
  }
});

document.addEventListener('mousemove', ({ pageX: x, pageY: y }) => {
  mousePos = { x, y };

  if (!document.body.classList.contains('show-task-overlays')) return;

  const now = Date.now();
  if (now - lastMouseMoveAt < 40) return;
  lastMouseMoveAt = now;

  if (document.body.classList.contains('wills-css-injector')) {
    document.body.style.transformOrigin = `${mousePos.x}px ${mousePos.y}px`;
  }
});
