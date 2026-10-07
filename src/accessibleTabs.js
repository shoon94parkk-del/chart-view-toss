// Manual activation keeps arrow navigation from starting lazy provider requests.
// Enter/Space keep the native button behavior and the view's existing click path.
export function bindHorizontalTabs(list) {
  if (!list) return;
  const tabs = () => [...list.querySelectorAll('[role="tab"]')]
    .filter(tab => tab.closest('[role="tablist"]') === list && !tab.disabled && !tab.hidden);
  const entry = tab => list.querySelectorAll('[role="tab"]').forEach(node => {
    node.tabIndex = node === tab ? 0 : -1;
  });
  const selected = () => tabs().find(tab => tab.getAttribute('aria-selected') === 'true') || tabs()[0];
  entry(selected());
  list.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const eligible = tabs(), index = eligible.indexOf(event.target);
    if (index < 0) return;
    const nextIndex = {
      ArrowRight: (index + 1) % eligible.length,
      ArrowLeft: (index + eligible.length - 1) % eligible.length,
      Home: 0, End: eligible.length - 1,
    }[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault();
    const next = eligible[nextIndex];
    entry(next);
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  });
  list.addEventListener('click', event => {
    const tab = event.target.closest('[role="tab"]');
    if (tabs().includes(tab)) entry(tab);
  });
  list.addEventListener('focusout', event => {
    if (!list.contains(event.relatedTarget)) entry(selected());
  });
}

export function focusSelectedTab(list) {
  const tab = list?.querySelector('[role="tab"][aria-selected="true"]');
  if (!tab || tab.disabled) return;
  tab.focus({ preventScroll: true });
  tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}
