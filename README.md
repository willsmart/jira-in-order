# jira-in-order

Chrome browser extension to easily prioritize tasks in Jira

## Installation using binary

1. Download `jira-in-order.crx` from the latest release.
2. Load into Chrome

## Installation from source

1. Clone this repo `git@github.com:willsmart/jira-in-order.git` or otherwise get the codebase onto a local drive
2. On [chrome://extensions/](chrome://extensions/), click "Load unpacked" and select the `jira-in-order` directory
3. Everything is on an MIT licence so go nuts with your IDE! Feel free to create a Pull Request if make the extension do something cool

## Usage

1. Navigate to your Jira board

- The URL should be like "https://\*.atlassian.net/secure/RapidBoard.jspa\*"

2. Press and hold the `control` key
3. The display should shrink slightly and cards needing attention will be highlighted with styling and priority numbers showing the order you could attack them.

## Business rules

Under the hood `jira-in-order` has a set of business rules in `business-rules.ts` which are used to determine the numeric priority and a set of tasks for any given card on the board within the context of all the other cards.
For now, business rules are hard-coded to how we do things at Melon. The cards will be highlighted if they fit one or more of these states (in order of priority):

- If a card has no "Component" field set. This is high priority since it's incredibly easy to fix and affects the whole team.
- If a card you're assigned to is in QA and is flagged. You're blocking the release! Get on it.
- If a card requires deployment, and there are no other cards that appear to be blocking it from being deployed.
- If a card is ready to QA
- If a card is ready to review
- If a card is in review, but not yet merged it's worth having a look
- Cards you're working on
- Top card in todo.

Later on it'll be good to decouple the rules from the codebase and make them user editable.

For now this is just the initial set of code best suited to Melon.

Enjoy!
