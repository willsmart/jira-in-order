enum Task {
  couldFix = 'couldFix',
  canDeploy = 'canDeploy',
  blockingRelease = 'blockingRelease',
  couldQA = 'couldQA',
  couldInitiateReview = 'couldInitiateReview',
  couldReview = 'couldReview',
  couldContinueCoding = 'couldContinueCoding',
  couldPickUp = 'couldPickUp',
}

function priorityForTask(task: Task): number {
  switch (task) {
    case Task.couldFix:
      return 10000;
    case Task.canDeploy:
      return 1000;
    case Task.blockingRelease:
      return 2000;
    case Task.couldQA:
      return 500;
    case Task.couldInitiateReview:
      return 400;
    case Task.couldReview:
      return 300;
    case Task.couldContinueCoding:
      return 200;
    case Task.couldPickUp:
      return 50;
  }
}

function taskTitle({ task, card }: { task: Task; card: Card }): string {
  switch (task) {
    case Task.couldFix:
      return `You could set my component. It's missing. Won't take a sec.`;
    case Task.canDeploy:
      return `You could deploy ${[...card.platforms.values()].sort().join('/')}`;
    case Task.blockingRelease:
      return `I'm holding up the release!`;
    case Task.couldQA:
      return `You could QA me`;
    case Task.couldInitiateReview:
      return `You could be first to review me`;
    case Task.couldReview:
      return `You could lend a hand in reviewing me`;
    case Task.couldContinueCoding:
      return `You may as well plod on with me`;
    case Task.couldPickUp:
      return `You could pick me up`;
  }
}

function prioritizedCard({ card, cards, log = false }: { card: Card; cards: Card[]; log?: boolean }): PrioritizedCard {
  const tasks = new Set<Task>();

  if (!card.platforms.size) tasks.add(Task.couldFix);

  switch (card.requires) {
    case Requires.deployment:
      if (
        ![...card.platforms.values()].find(platform =>
          cards.find(
            c =>
              c.platforms.has(platform) &&
              (c.requires == Requires.review || (c.stage == Stage.qa && c.requires != Requires.deployment))
          )
        )
      ) {
        tasks.add(Task.canDeploy);
      }
      break;
  }
  switch (card.stage) {
    case Stage.qa:
      if (card.mine && card.flagged) tasks.add(Task.blockingRelease);
      break;
    case Stage.review:
      if (!card.mine && card.requires == 'QA') tasks.add(Task.couldQA);
      if (!card.mine && card.githubState != 'merged') tasks.add(Task.couldReview);
      break;
    case Stage.dev:
      if (!card.mine && card.requires == Requires.review) tasks.add(Task.couldInitiateReview);
      if (card.mine) tasks.add(Task.couldContinueCoding);
      break;
    case Stage.todo:
      if (card == cards.find(card => card.stage == Stage.todo && !card.assignee)) tasks.add(Task.couldPickUp);
      break;
  }

  if (log) console.log({ card, tasks });

  return {
    ...card,
    tasks,
    priority: [...tasks.values()].reduce((acc, task) => acc + priorityForTask(task), 0),
  };
}
