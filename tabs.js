(function () {
  const buttons = document.querySelectorAll('[data-tab]');
  const panels = document.querySelectorAll('.tab-panel');
  if (!buttons.length || !panels.length) return;

  function selectTab(button) {
    buttons.forEach(tab => {
      const selected = tab === button;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => {
      const selected = panel.id === button.getAttribute('aria-controls');
      panel.hidden = !selected;
      panel.classList.toggle('active', selected);
    });
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => selectTab(button));
    button.addEventListener('keydown', event => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const next = event.key === 'ArrowRight' ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
      buttons[next].focus();
      selectTab(buttons[next]);
    });
  });

  selectTab(document.querySelector('[data-tab].active') || buttons[0]);
})();
